const TARGET_MAX_SIZE_MB = 45
const TARGET_SAMPLE_RATE = 22050
const DEFAULT_BITRATE_KBPS = 64
const MIN_BITRATE_KBPS = 24
const MAX_BITRATE_KBPS = 96

type CompressionInput = {
  file: File
  maxSizeMb?: number
}

type CompressionResult = {
  file: File
  didCompress: boolean
  originalSizeMb: number
  finalSizeMb: number
  targetSizeMb: number
  bitrateKbps: number
}

type LameEncoderModule = {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
    encodeBuffer: (left: Int16Array) => Int8Array
    flush: () => Int8Array
  }
}

let lameEncoderModule: LameEncoderModule | null = null

const toMb = (bytes: number): number => bytes / (1024 * 1024)

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const replaceFileExtension = (name: string, extension: string): string => {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) {
    return `${name}${extension}`
  }

  return `${name.slice(0, dotIndex)}${extension}`
}

const convertFloat32ToInt16 = (samples: Float32Array): Int16Array => {
  const buffer = new Int16Array(samples.length)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = clamp(samples[index], -1, 1)
    buffer[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return buffer
}

const toArrayBuffer = (chunk: Int8Array): ArrayBuffer => {
  const bytes = new Uint8Array(chunk.length)
  bytes.set(chunk)
  return bytes.buffer
}

const getLameEncoderModule = async (): Promise<LameEncoderModule> => {
  if (lameEncoderModule) {
    return lameEncoderModule
  }

  const importedModule = await import('lamejs')
  lameEncoderModule = (importedModule.default ?? importedModule) as LameEncoderModule
  return lameEncoderModule
}

const decodeAndResampleMono = async (file: File): Promise<Float32Array> => {
  const sourceArrayBuffer = await file.arrayBuffer()
  const audioContext = new AudioContext()

  try {
    const decodedBuffer = await audioContext.decodeAudioData(sourceArrayBuffer)
    const frameCount = Math.ceil(decodedBuffer.duration * TARGET_SAMPLE_RATE)
    const offlineContext = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE)
    const monoBuffer = offlineContext.createBuffer(1, decodedBuffer.length, decodedBuffer.sampleRate)

    const destinationChannel = monoBuffer.getChannelData(0)
    for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel += 1) {
      const sourceChannel = decodedBuffer.getChannelData(channel)
      for (let sample = 0; sample < sourceChannel.length; sample += 1) {
        destinationChannel[sample] += sourceChannel[sample] / decodedBuffer.numberOfChannels
      }
    }

    const sourceNode = offlineContext.createBufferSource()
    sourceNode.buffer = monoBuffer
    sourceNode.connect(offlineContext.destination)
    sourceNode.start(0)

    const renderedBuffer = await offlineContext.startRendering()
    return renderedBuffer.getChannelData(0)
  } finally {
    await audioContext.close()
  }
}

const encodeMp3 = async (monoSamples: Float32Array, bitrateKbps: number): Promise<Blob> => {
  const lamejs = await getLameEncoderModule()
  const mp3Encoder = new lamejs.Mp3Encoder(1, TARGET_SAMPLE_RATE, bitrateKbps)
  const pcm16 = convertFloat32ToInt16(monoSamples)
  const chunkSize = 1152
  const chunks: ArrayBuffer[] = []

  for (let index = 0; index < pcm16.length; index += chunkSize) {
    const sampleChunk = pcm16.subarray(index, index + chunkSize)
    const encodedChunk = mp3Encoder.encodeBuffer(sampleChunk)
    if (encodedChunk.length > 0) {
      chunks.push(toArrayBuffer(encodedChunk))
    }
  }

  const flushChunk = mp3Encoder.flush()
  if (flushChunk.length > 0) {
    chunks.push(toArrayBuffer(flushChunk))
  }

  return new Blob(chunks, { type: 'audio/mpeg' })
}

const calculateTargetBitrate = (durationSeconds: number, targetSizeBytes: number): number => {
  if (durationSeconds <= 0) {
    return DEFAULT_BITRATE_KBPS
  }

  const calculated = Math.floor((targetSizeBytes * 8) / durationSeconds / 1000)
  return clamp(calculated, MIN_BITRATE_KBPS, MAX_BITRATE_KBPS)
}

export const compressAudioForUpload = async ({
  file,
  maxSizeMb = TARGET_MAX_SIZE_MB,
}: CompressionInput): Promise<CompressionResult> => {
  const originalSizeMb = toMb(file.size)
  const targetSizeMb = Math.min(maxSizeMb, originalSizeMb)

  if (typeof window === 'undefined' || !file.type.startsWith('audio/')) {
    return {
      file,
      didCompress: false,
      originalSizeMb,
      finalSizeMb: originalSizeMb,
      targetSizeMb,
      bitrateKbps: DEFAULT_BITRATE_KBPS,
    }
  }

  if (originalSizeMb <= maxSizeMb) {
    return {
      file,
      didCompress: false,
      originalSizeMb,
      finalSizeMb: originalSizeMb,
      targetSizeMb,
      bitrateKbps: DEFAULT_BITRATE_KBPS,
    }
  }

  const monoSamples = await decodeAndResampleMono(file)
  const durationSeconds = monoSamples.length / TARGET_SAMPLE_RATE
  const targetSizeBytes = targetSizeMb * 1024 * 1024
  const initialBitrateKbps = calculateTargetBitrate(durationSeconds, targetSizeBytes)
  const candidateBitrates = Array.from(
    new Set([initialBitrateKbps, 48, 40, 32, 24].map((value) => clamp(value, MIN_BITRATE_KBPS, MAX_BITRATE_KBPS)))
  )

  let bestBlob: Blob | null = null
  let bestBitrate = initialBitrateKbps

  for (const bitrate of candidateBitrates) {
    const encodedBlob = await encodeMp3(monoSamples, bitrate)

    if (!bestBlob || encodedBlob.size < bestBlob.size) {
      bestBlob = encodedBlob
      bestBitrate = bitrate
    }

    if (encodedBlob.size <= targetSizeBytes) {
      bestBlob = encodedBlob
      bestBitrate = bitrate
      break
    }
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return {
      file,
      didCompress: false,
      originalSizeMb,
      finalSizeMb: originalSizeMb,
      targetSizeMb,
      bitrateKbps: bestBitrate,
    }
  }

  const compressedFile = new File([bestBlob], replaceFileExtension(file.name, '.mp3'), {
    type: 'audio/mpeg',
    lastModified: file.lastModified,
  })

  return {
    file: compressedFile,
    didCompress: true,
    originalSizeMb,
    finalSizeMb: toMb(compressedFile.size),
    targetSizeMb,
    bitrateKbps: bestBitrate,
  }
}

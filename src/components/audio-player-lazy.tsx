"use client";

// NOTE: Created this component so that audio files are only retrieved if use attempts to play it.  
// TODO: have to click play 2x to work?

import { AudioLines, EllipsisVertical, Pause, Play, RotateCcw, RotateCw, Trash2, Volume2 } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./ui/hover-card";
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent } from "./ui/card";
import { toast } from "sonner";
import Spinner from "./ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface LazyAudioPlayerProps {
  meetingId: string;
  duration: number;
  onTimeUpdate?: (time: number) => void;
  onAudioReset?: () => void;
}

export interface AudioPlayerRef {
  seek: (time: number) => void;
}

const LazyAudioPlayer = forwardRef<AudioPlayerRef, LazyAudioPlayerProps>(({ meetingId, onTimeUpdate, onAudioReset }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioDeleted, setAudioDeleted] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useImperativeHandle(ref, () => ({
    seek(time: number) {
      if (audioDeleted) return;

      if (audioRef.current && audioLoaded) {
        audioRef.current.currentTime = time;
        if (audioRef.current.paused) {
            audioRef.current.play();
        }
      } else if (!audioLoaded) {
        // If audio isn't loaded yet, load it first then seek
        loadAudio().then(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = time;
            audioRef.current.play();
          }
        });
      }
    }
  }));

  const loadAudio = async () => {
    if (isLoadingAudio || audioLoaded || audioDeleted) return;

    setIsLoadingAudio(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/audio`);
      if (!response.ok) {
        throw new Error('Failed to load audio');
      }
      const data = await response.json();
      setAudioUrl(data.audioUrl);
      setAudioLoaded(true);
    } catch (error) {
      console.error('Error loading audio:', error);
      toast.error('Failed to load audio file');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const resetAudioState = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioUrl(null);
    setAudioLoaded(false);
    setProgress(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDeleted(true);
  };

  const handleDeleteAudio = async () => {
    if (isConfirmingDelete) {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/audio`, {
          method: "DELETE",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message = data?.error || data?.details || "Failed to delete audio file";
          console.error("Error deleting audio file:", message);
          throw new Error(message);
        }

        resetAudioState();
        onAudioReset?.();
        setIsConfirmingDelete(false);
      } catch (error) {
        console.error("Error deleting audio:", error);
        toast.error("Failed to delete audio file");
        setIsConfirmingDelete(false);
      }
    } else {
      setIsConfirmingDelete(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 3000);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioLoaded) {
        audio.volume = volume / 100;
    }
  }, [volume, audioLoaded]);

  useEffect(() => {
    if (audioRef.current && audioLoaded) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioLoaded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioLoaded) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime);
      }
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
    };
  }, [onTimeUpdate, audioLoaded]);

  const togglePlayPause = async () => {
    if (audioDeleted) return;

    if (!audioLoaded) {
      await loadAudio();
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioDeleted) return;

    if (audioRef.current && audioRef.current.duration > 0 && audioLoaded) {
      const seekTime = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setProgress(value[0]);
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };
  
  const handleForward = async () => {
    if (audioDeleted) return;

    if (!audioLoaded) {
      await loadAudio();
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, audioRef.current.duration);
    }
  };

  const handleRewind = async () => {
    if (audioDeleted) return;

    if (!audioLoaded) {
      await loadAudio();
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const speeds = [1, 1.5, 2, 2.5, 3];
  const handleSpeedChange = () => {
    if (audioDeleted) return;
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackRate(speeds[nextIndex]);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) seconds = 0;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Card className="border-none relative">
        <CardContent className="mr-[1rem]">
          {(audioLoaded && audioUrl) && (
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              preload="metadata" 
              onLoadedMetadata={() => setCurrentTime(0)} 
            />
          )}
          <div className="flex flex-col items-center justify-center w-full ">
            <div className="w-full ">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                disabled={!audioLoaded || audioDeleted}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                showTooltip
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                tooltipContent={(value) => formatTime((value / 100) * audioRef.current?.duration || 0)}
              />
              <div className="w-full flex justify-between mt-2">
                <p className="text-sm text-muted-foreground">{formatTime(currentTime)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(audioRef.current?.duration || 0)}</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:gap-2 -my-5">
              <Button variant="ghost" onClick={handleRewind} disabled={isLoadingAudio || audioDeleted}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={togglePlayPause} disabled={isLoadingAudio || audioDeleted}>
                {isLoadingAudio ? (
                  <Spinner className="stroke-5 size-4 stroke-muted-foreground" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" onClick={handleForward} disabled={isLoadingAudio || audioDeleted}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" disabled={!audioLoaded || audioDeleted}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto p-2">
                  <Slider
                    orientation="vertical"
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="h-24"
                  />
                </HoverCardContent>
              </HoverCard>
              <Button variant="ghost" onClick={handleSpeedChange} className="font-semibold text-xs" disabled={!audioLoaded || audioDeleted}>
                {playbackRate.toFixed(1)}x
              </Button>
            </div>
          </div>
          {!audioLoaded && !audioUrl && audioDeleted && (
            <div className="text-center text-sm text-muted-foreground mb-4">
              Audio removed. Upload a new file to play back the meeting.
            </div>
          )}
          {!audioDeleted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="absolute right-1 top-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-fit h-fit py-2 px-1 m-0"
                  >
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-fit" align="end">
                  <DropdownMenuLabel>Audio Actions</DropdownMenuLabel>
                  <DropdownMenuItem disabled={true}>
                    <AudioLines className="size-4" />
                    Edit Audio
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    variant='destructive'
                    onClick={handleDeleteAudio}
                    onSelect={(e) => {
                      if (!isConfirmingDelete) {
                        e.preventDefault();
                      }
                    }}
                    className="rounded-lg"
                  >
                    <Trash2 className="size-4" />
                    {isConfirmingDelete ? 'Confirm Delete' : 'Delete Audio'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          )}
        </CardContent>
    </Card>
  );
});

LazyAudioPlayer.displayName = "LazyAudioPlayer";
export default LazyAudioPlayer; 

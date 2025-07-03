"use client";

import { Pause, Play, RotateCcw, RotateCw, Volume2, Loader2 } from "lucide-react";
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

interface LazyAudioPlayerProps {
  meetingId: string;
  duration: number;
  onTimeUpdate?: (time: number) => void;
}

export interface AudioPlayerRef {
  seek: (time: number) => void;
}

const LazyAudioPlayer = forwardRef<AudioPlayerRef, LazyAudioPlayerProps>(({ meetingId, duration, onTimeUpdate }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    seek(time: number) {
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
    if (isLoadingAudio || audioLoaded) return;
    
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
      if (duration > 0) {
        setProgress((audio.currentTime / duration) * 100);
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
  }, [duration, audioLoaded, onTimeUpdate]);

  const togglePlayPause = async () => {
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
    if (audioRef.current && duration > 0 && audioLoaded) {
      const seekTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = seekTime;
      setProgress(value[0]);
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };
  
  const handleForward = async () => {
    if (!audioLoaded) {
      await loadAudio();
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const handleRewind = async () => {
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
    <Card>
        <CardContent className="">
          {audioLoaded && audioUrl && (
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              preload="metadata" 
              onLoadedMetadata={() => setCurrentTime(0)} 
            />
          )}
          <div className="flex flex-col items-center justify-center w-full">
            <div className="w-full">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                disabled={!audioLoaded}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                showTooltip
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                tooltipContent={(value) => formatTime((value / 100) * duration)}
              />
              <div className="w-full flex justify-between mt-2">
                <p className="text-sm text-muted-foreground">{formatTime(currentTime)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(duration)}</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:gap-2 -my-5">
              <Button variant="ghost" onClick={handleRewind} disabled={isLoadingAudio}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={togglePlayPause} disabled={isLoadingAudio}>
                {isLoadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" onClick={handleForward} disabled={isLoadingAudio}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" disabled={!audioLoaded}>
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
              <Button variant="ghost" onClick={handleSpeedChange} className="font-semibold text-xs" disabled={!audioLoaded}>
                {playbackRate.toFixed(1)}x
              </Button>
            </div>
          </div>
        </CardContent>
    </Card>
  );
});

LazyAudioPlayer.displayName = "LazyAudioPlayer";
export default LazyAudioPlayer; 
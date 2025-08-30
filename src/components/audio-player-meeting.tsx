"use client";

// NOTE: Created this for the refactoring of the meeting/[id] page to be a server page that imports client components.

import LazyAudioPlayer, { AudioPlayerRef } from "@/components/audio-player-lazy";
import { useRef, forwardRef, useImperativeHandle } from "react";

interface MeetingAudioPlayerProps {
  meetingId: string;
  duration: number;
  onTimeUpdate?: (time: number) => void;
}

const MeetingAudioPlayer = forwardRef<AudioPlayerRef, MeetingAudioPlayerProps>(({ meetingId, duration, onTimeUpdate }, ref) => {
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.seek(time);
      }
    }
  }));

  const handleTimeUpdate = (time: number) => {
    // Handle time updates if needed
    if (onTimeUpdate) {
      onTimeUpdate(time);
    }
  };

  return (
    <div className="w-full">
      <LazyAudioPlayer
        ref={audioPlayerRef}
        meetingId={meetingId}
        duration={duration}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
});

MeetingAudioPlayer.displayName = "MeetingAudioPlayer";

export default MeetingAudioPlayer;

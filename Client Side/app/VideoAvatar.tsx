// app/VideoAvatar.tsx
"use client";

import { useEffect, useRef } from 'react';
import { AgentState } from "@livekit/components-react";

interface VideoAvatarProps {
  agentState: AgentState;
}

export function VideoAvatar({ agentState }: VideoAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>();

  const segmentTimes = {
    idle: { start: 0.5, end: 7.2 },
    speaking: { start: 7.4, end: 11.2 },
  };

  const loopVideoSegment = (segment: 'idle' | 'speaking') => {
    if (!videoRef.current) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const { start, end } = segmentTimes[segment];

    const loop = () => {
      if (videoRef.current) {
        if (videoRef.current.currentTime >= end || videoRef.current.currentTime < start) {
          videoRef.current.currentTime = start;
        }
        videoRef.current.play().catch(console.error);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    videoRef.current.currentTime = start;
    loop();
  };

  // Handle initial video setup
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Add loadedmetadata event listener
      const handleLoadedMetadata = () => {
        video.playbackRate = 0.75; // Set playback rate to 0.5x
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      // Also set it immediately in case the metadata is already loaded
      video.playbackRate = 0.75;

      // Cleanup
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, []);

  // Handle state changes
  useEffect(() => {
    if (agentState === 'speaking') {
      loopVideoSegment('speaking');
    } else {
      loopVideoSegment('idle');
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [agentState]);

  return (
    <div className="video-avatar-container">
      <video
        ref={videoRef}
        className="video-avatar"
        muted
        playsInline
        preload="auto"
      >
        <source src="/lisa.mp4" type="video/mp4" />
      </video>
      <div className="gradient-overlay" />
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_ID = "PQleT6BtCbE";
const START_SEC = 5;
// YouTube fades its own controls out shortly after playback starts; stay hidden until they're gone
const REVEAL_DELAY_MS = 2500;

// The parts of the YouTube IFrame Player API used here
type Player = {
  mute(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};
type PlayerEvent = { target: Player; data: number };
type YouTubeApi = {
  Player: new (el: HTMLElement, opts: {
    videoId: string;
    width: string;
    height: string;
    playerVars: Record<string, number | string>;
    events: { onReady: (e: PlayerEvent) => void; onStateChange: (e: PlayerEvent) => void };
  }) => Player;
};
declare global {
  interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void }
}

const PLAYING = 1, BUFFERING = 3;
const API_SRC = "https://www.youtube.com/iframe_api";

/**
 * Muted background video for the landing page.
 *
 * YouTube draws its own play/pause/skip overlay inside the player when it loads, pauses or reaches
 * the end, and that can't be styled from this page (the player is cross-origin). So the player stays
 * invisible except while it is actually playing, and it loops itself before the end screen appears.
 */
export default function WallStreetVideo() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // People who prefer reduced motion get the static background
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let player: Player | null = null;
    let cancelled = false;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let loopTimer: ReturnType<typeof setInterval> | undefined;

    const create = () => {
      if (cancelled || !host.current || !window.YT) return;
      player = new window.YT.Player(host.current, {
        videoId: VIDEO_ID,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3,
          modestbranding: 1, playsinline: 1, rel: 0, start: START_SEC,
        },
        events: {
          onReady: e => { e.target.mute(); e.target.playVideo(); },
          onStateChange: e => {
            if (e.data === PLAYING) {
              clearTimeout(revealTimer);
              revealTimer = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
            } else if (e.data !== BUFFERING) {
              // Unstarted, paused, cued or ended: YouTube shows its controls, so hide the player
              clearTimeout(revealTimer);
              setVisible(false);
              e.target.seekTo(START_SEC, true);
              e.target.playVideo();
            }
          },
        },
      });
      // Loop before the end so YouTube's end screen never appears
      loopTimer = setInterval(() => {
        const duration = player?.getDuration?.() ?? 0;
        const time = player?.getCurrentTime?.() ?? 0;
        if (duration > 0 && duration - time < 1.5) player?.seekTo(START_SEC, true);
      }, 500);
    };

    if (window.YT?.Player) {
      create();
    } else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); create(); };
      if (!document.querySelector(`script[src="${API_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = API_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(revealTimer);
      clearInterval(loopTimer);
      player?.destroy?.();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ width: "180vw", height: "180vh" }}
      >
        <div ref={host} className="w-full h-full" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/95" />
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}

const WallStreetVideo = () => (
  <div className="absolute inset-0 overflow-hidden">
    <iframe
      src="https://www.youtube.com/embed/PQleT6BtCbE?autoplay=1&mute=1&loop=1&playlist=PQleT6BtCbE&controls=0&showinfo=0&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3&playsinline=1&start=5"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ width: "180vw", height: "180vh", border: "none" }}
      allow="autoplay; encrypted-media"
      title="Background"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/95" />
    <div className="absolute inset-0 bg-background/40" />
  </div>
);

export default WallStreetVideo;

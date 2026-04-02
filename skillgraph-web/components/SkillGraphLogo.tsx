const SkillGraphLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
      <circle cx="16" cy="8" r="3" fill="hsl(var(--gold))" className="animate-pulse-glow" />
      <circle cx="8" cy="22" r="3" fill="hsl(var(--gold-light))" />
      <circle cx="24" cy="22" r="3" fill="hsl(var(--gold))" />
      <circle cx="16" cy="28" r="2" fill="hsl(var(--gold-light))" opacity="0.6" />
      <line x1="16" y1="11" x2="8" y2="19" stroke="hsl(var(--gold))" strokeWidth="1.5" opacity="0.5" />
      <line x1="16" y1="11" x2="24" y2="19" stroke="hsl(var(--gold))" strokeWidth="1.5" opacity="0.5" />
      <line x1="8" y1="22" x2="24" y2="22" stroke="hsl(var(--gold-light))" strokeWidth="1" opacity="0.3" />
      <line x1="16" y1="26" x2="8" y2="22" stroke="hsl(var(--gold-light))" strokeWidth="1" opacity="0.3" />
      <line x1="16" y1="26" x2="24" y2="22" stroke="hsl(var(--gold-light))" strokeWidth="1" opacity="0.3" />
    </svg>
    <span className="font-heading text-lg font-bold tracking-tight text-foreground">
      Skill<span className="text-primary">Graph</span>
    </span>
  </div>
);

export default SkillGraphLogo;

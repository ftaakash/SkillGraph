"use client";

interface GapData {
  skill: string;
  count: number;
}

export default function CohortChart({ data }: { data: GapData[] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">No gap data available.</p>;
  }

  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.skill} className="flex items-center gap-3">
          <span className="text-sm text-foreground font-medium w-32 truncate">{d.skill}</span>
          <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden border border-border">
            <div
              className="h-full gradient-primary rounded-md transition-all duration-500"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono w-8 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

"use client";

interface Breakdown {
  keywordMatch: { score: number; max: number; matchedCount: number; totalKeywords: number };
  format: { score: number; max: number };
  quantification: { score: number; max: number; numbersFound: number };
  actionVerbs: { score: number; max: number; verbsFound: number };
  completeness: { score: number; max: number };
}

interface AtsScorePreviewProps {
  score: number;
  breakdown: Breakdown | null;
  loading?: boolean;
}

const categories = [
  { key: "keywordMatch", label: "Keyword Match", max: 40, color: "text-blue-400" },
  { key: "format", label: "Format & Structure", max: 20, color: "text-green-400" },
  { key: "quantification", label: "Quantification", max: 20, color: "text-yellow-400" },
  { key: "actionVerbs", label: "Action Verbs", max: 10, color: "text-purple-400" },
  { key: "completeness", label: "Section Completeness", max: 10, color: "text-pink-400" },
];

export default function AtsScorePreview({ score, breakdown, loading }: AtsScorePreviewProps) {
  const scoreColor = score >= 80 ? "text-green-500" : score >= 60 ? "text-primary" : score >= 40 ? "text-yellow-500" : "text-destructive";
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-4">ATS Score</h3>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Circular Score */}
          <div className="flex justify-center mb-5">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8"
                  fill="none" className="text-muted/30" />
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8"
                  fill="none" className={scoreColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-heading font-black ${scoreColor}`}>{score}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/100</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {breakdown && (
            <div className="space-y-2.5">
              {categories.map((cat) => {
                const val = (breakdown as any)[cat.key]?.score ?? 0;
                const pct = (val / cat.max) * 100;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{cat.label}</span>
                      <span className={`text-xs font-semibold ${cat.color}`}>{val}/{cat.max}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500`}
                        style={{
                          width: `${pct}%`,
                          background: `var(--color-primary)`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

type RiskLevel = "low" | "moderate" | "high";

const styles: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-risk-lowBg", text: "text-risk-low", label: "riskLowShort" },
  moderate: { bg: "bg-risk-moderateBg", text: "text-risk-moderate", label: "riskModerateShort" },
  high: { bg: "bg-risk-highBg", text: "text-risk-high", label: "riskHighShort" },
};

export default function RiskBadge({
  level,
  label,
}: {
  level: RiskLevel;
  label?: string;
}) {
  const s = styles[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${s.bg} ${s.text}`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "currentColor" }} />
      {label || ""}
    </span>
  );
}

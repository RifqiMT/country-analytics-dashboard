/** Header + content tint per screenshot palette */
export const PESTEL_DIMENSION_STYLES: Record<string, { header: string; tint: string }> = {
  POLITICAL: { header: "#1e3a5f", tint: "#e8eef5" },
  ECONOMIC: { header: "#2d5a4c", tint: "#e9f2ef" },
  SOCIOCULTURAL: { header: "#9a7340", tint: "#f4efe6" },
  TECHNOLOGICAL: { header: "#b8573a", tint: "#f7ece8" },
  ENVIRONMENTAL: { header: "#6b2d38", tint: "#f0e8ea" },
  LEGAL: { header: "#4a4568", tint: "#ebeaf2" },
};

export const SWOT_STYLES = {
  strengths: { header: "#2D5A4C", tint: "#E9F2EF", title: "Strengths" },
  weaknesses: { header: "#A04A26", tint: "#F7EEEA", title: "Weaknesses" },
  opportunities: { header: "#1D6391", tint: "#E8F1F6", title: "Opportunities" },
  threats: { header: "#B01E43", tint: "#F6E8EB", title: "Threats" },
} as const;

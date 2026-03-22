export type PestelDimension = {
  letter: "P" | "E" | "S" | "T" | "E" | "L";
  label: string;
  bullets: string[];
};

export type PestelSwot = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export type ComprehensiveSection = { title: string; body: string };

export type StrategicSection = { title: string; paragraphs: string[] };

export type PestelAnalysis = {
  pestelDimensions: PestelDimension[];
  swot: PestelSwot;
  comprehensiveSections: ComprehensiveSection[];
  strategicBusiness: StrategicSection[];
  newMarketAnalysis: string[];
  keyTakeaways: string[];
  recommendations: string[];
};

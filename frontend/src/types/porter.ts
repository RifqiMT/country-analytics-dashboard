export type PorterForce = {
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  bullets: string[];
  accent: string;
};

export type PorterAnalysis = {
  forces: PorterForce[];
  comprehensiveSections: { title: string; body: string }[];
  newMarketAnalysis: string[];
  keyTakeaways: string[];
  recommendations: string[];
};

export type IloIsicDivision = {
  code: string;
  label: string;
};

export type Region =
  | "osaka-city"
  | "kita"
  | "kita-kawachi"
  | "naka-kawachi"
  | "minami-kawachi"
  | "sen-hoku"
  | "sen-nan";

export const REGION_LABELS: Record<Region, string> = {
  "osaka-city": "大阪市域",
  kita: "北大阪地域",
  "kita-kawachi": "北河内地域",
  "naka-kawachi": "中河内地域",
  "minami-kawachi": "南河内地域",
  "sen-hoku": "泉北地域",
  "sen-nan": "泉南地域",
};

export interface Municipality {
  id: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
  population: number;
  popChangeRate: number;
  agingRate: number;
  areaKm2: number;
  households: number;
  fiscalIndex: number;
}

export type IssueCategoryKey =
  | "population"
  | "aging"
  | "vacant"
  | "transit"
  | "community"
  | "successor"
  | "disaster"
  | "dx";

export const ISSUE_CATEGORIES: { key: IssueCategoryKey; label: string }[] = [
  { key: "population", label: "人口減少" },
  { key: "aging", label: "高齢化" },
  { key: "vacant", label: "空き家" },
  { key: "transit", label: "公共交通" },
  { key: "community", label: "地域コミュニティ" },
  { key: "successor", label: "担い手不足" },
  { key: "disaster", label: "防災" },
  { key: "dx", label: "DX" },
];

export type IssueScores = Record<IssueCategoryKey, number>;

export interface MunicipalityNote {
  municipalityId: string;
  body: string;
  updatedAt: string;
}

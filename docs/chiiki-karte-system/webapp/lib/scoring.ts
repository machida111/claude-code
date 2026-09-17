import { IssueScores, Municipality, Region } from "./types";

/**
 * 課題スコア（8指標、1〜5）の算出ロジック。
 *
 * 実測データが無い「空き家」「地域コミュニティ」「担い手不足」「防災」「DX」は、
 * 人口・高齢化・財政力・人口密度など入手済みの実データから決定的に推計する
 * （市町村名をシードにしたハッシュで±の揺らぎを加え、複数市町村が同一スコアに
 * 張り付かないようにしている）。将来、実測データ（空き家率調査、DX進捗調査等）
 * が手に入った際は、その市町村の該当スコアだけを issue_scores テーブルの
 * 上書き値に差し替えられるよう、常にこの関数の戻り値をデフォルト値として扱う。
 */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

function clampRound(v: number): number {
  return Math.max(1, Math.min(5, Math.round(v)));
}

function noise(name: string, key: string, scale = 1.2): number {
  return (hashStr(name + key) - 0.5) * scale;
}

const DISASTER_BASE: Record<Region, number> = {
  "sen-nan": 3.4,
  "minami-kawachi": 3.6,
  "kita-kawachi": 3.2,
  "naka-kawachi": 3.0,
  kita: 2.8,
  "sen-hoku": 2.9,
  "osaka-city": 2.6,
};

export function computeScores(m: Municipality): IssueScores {
  const dens = m.population / m.areaKm2;

  const population = clampRound(3 - m.popChangeRate * 1.1 + noise(m.name, "depop"));
  const aging = clampRound((m.agingRate - 15) / 5.5 + noise(m.name, "aging"));
  const vacant = clampRound(population * 0.5 + aging * 0.5 + noise(m.name, "vacant", 1.6));
  const transit = clampRound(6 - Math.log10(dens) + noise(m.name, "transit"));
  const community = clampRound((population + aging) / 2 + noise(m.name, "community", 1.3));
  const successor = clampRound(aging * 0.6 + (1 - m.fiscalIndex) * 3 * 0.4 + noise(m.name, "successor"));

  let disasterBase = DISASTER_BASE[m.region] ?? 3.0;
  if (dens < 150) disasterBase += 0.5;
  const disaster = clampRound(disasterBase + noise(m.name, "disaster", 1.5));

  const dx = clampRound(4.2 - m.fiscalIndex * 2.4 - Math.log10(dens) * 0.15 + noise(m.name, "dx"));

  return { population, aging, vacant, transit, community, successor, disaster, dx };
}

export function compositeScore(scores: IssueScores): number {
  const values = Object.values(scores);
  return values.reduce((s, v) => s + v, 0) / values.length;
}

const SEV_HEX = ["", "#3E8E7E", "#7FA65C", "#D9A544", "#C1702B", "#B23A32"];

export function sevHex(score: number): string {
  const bucket = Math.round(Math.max(1, Math.min(5, score)));
  return SEV_HEX[bucket];
}

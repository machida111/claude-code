import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { IssueRadarChart } from "@/components/karte/IssueRadarChart";
import { MemoEditor } from "@/components/karte/MemoEditor";
import { getMunicipality, getMunicipalityNote } from "@/lib/data";
import { compositeScore, computeScores, sevHex } from "@/lib/scoring";
import { ISSUE_CATEGORIES, REGION_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtNum(n: number): string {
  return n.toLocaleString("ja-JP");
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-surface-2 p-3">
      <div className="text-[11px] font-semibold text-ink-muted">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

export default async function KartePage({ params }: { params: { id: string } }) {
  const municipality = await getMunicipality(params.id);
  if (!municipality) notFound();

  const [note, scores] = await Promise.all([
    getMunicipalityNote(params.id),
    Promise.resolve(computeScores(municipality)),
  ]);
  const composite = compositeScore(scores);
  const topIssues = ISSUE_CATEGORIES.map((c) => ({ ...c, score: scores[c.key] })).sort(
    (a, b) => b.score - a.score
  );

  return (
    <>
      <Header title="市町村カルテ" subtitle="市町村ごとの詳細プロファイル" />
      <section className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/map" className="text-xs font-semibold text-ink-muted hover:text-ink">
              ← 地図に戻る
            </Link>
            <h3 className="mt-2 text-lg font-display font-bold">{municipality.name}</h3>
            <p className="text-sm text-ink-muted">
              {REGION_LABELS[municipality.region]} ・ 総合スコア{" "}
              <b className="font-mono">{composite.toFixed(1)}</b> / 5.0
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-[18px] shadow">
            <div className="mb-3 text-sm font-bold">基本指標</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <StatTile label="人口" value={`${fmtNum(municipality.population)}人`} />
              <StatTile
                label="人口増減率"
                value={`${municipality.popChangeRate > 0 ? "+" : ""}${municipality.popChangeRate.toFixed(1)}%`}
              />
              <StatTile label="高齢化率" value={`${municipality.agingRate.toFixed(1)}%`} />
              <StatTile label="面積" value={`${municipality.areaKm2.toFixed(2)} km²`} />
              <StatTile label="世帯数" value={`${fmtNum(municipality.households)}世帯`} />
              <StatTile label="財政力指数" value={municipality.fiscalIndex.toFixed(2)} />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-[18px] shadow">
            <div className="mb-3 text-sm font-bold">課題スコア（8指標）</div>
            <IssueRadarChart name={municipality.name} scores={scores} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-[18px] shadow">
            <div className="mb-3 text-sm font-bold">主な地域課題</div>
            {topIssues.map((t, i) => (
              <div
                key={t.key}
                className={`flex items-center gap-2.5 py-2 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <span className="flex-1 text-sm font-semibold">{t.label}</span>
                <div className="h-[7px] w-[120px] overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(t.score / 5) * 100}%`, background: sevHex(t.score) }}
                  />
                </div>
                <span className="w-[22px] text-right font-mono text-sm">{t.score}</span>
              </div>
            ))}
          </div>
          <MemoEditor municipalityId={municipality.id} initialBody={note?.body ?? ""} />
        </div>
      </section>
    </>
  );
}

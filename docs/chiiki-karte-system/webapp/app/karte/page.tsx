import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { getMunicipalities } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function KartePickerPage() {
  const municipalities = await getMunicipalities();
  const sorted = [...municipalities].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <>
      <Header title="市町村カルテ" subtitle="市町村ごとの詳細プロファイル" />
      <section className="flex-1 overflow-y-auto p-6">
        <div className="rounded-2xl border border-border bg-surface p-[18px] shadow">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            市町村を選択してください
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-faint">
              {municipalities.length}市町村
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sorted.map((m) => (
              <Link
                key={m.id}
                href={`/karte/${m.id}`}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold hover:bg-surface-2"
              >
                {m.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

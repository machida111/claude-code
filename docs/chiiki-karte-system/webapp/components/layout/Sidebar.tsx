import Link from "next/link";

const NAV = [
  { href: "/map", label: "地域課題マップ", icon: "🗺️" },
  { href: "/karte", label: "市町村カルテ", icon: "🗂️" },
];

export function Sidebar() {
  return (
    <nav className="flex h-full w-[220px] flex-none flex-col gap-1 border-r border-border bg-surface p-3">
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1.5">
        <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-accent text-base text-white">
          🗺️
        </div>
        <div>
          <h1 className="font-display text-sm font-bold leading-tight">地域課題カルテ</h1>
          <span className="text-[11px] text-ink-muted">大阪府 市町村局振興課</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <span aria-hidden>{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-auto border-t border-border px-2 pt-2.5 text-[11px] text-ink-faint">
        統計値：e-Stat実データ
        <br />
        認証・AI分析は今後のフェーズで追加
      </div>
    </nav>
  );
}

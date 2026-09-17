export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex flex-none items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3.5">
      <div>
        <h2 className="text-[17px] font-display font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-ink-muted">
        👤 <b className="font-semibold text-ink">振興課 職員</b>（デモログイン）
      </div>
    </header>
  );
}

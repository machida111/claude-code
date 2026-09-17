"use client";

import { useRef, useState, useTransition } from "react";
import { saveNoteAction } from "@/app/karte/[id]/actions";

export function MemoEditor({ municipalityId, initialBody }: { municipalityId: string; initialBody: string }) {
  const [value, setValue] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(next: string) {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        await saveNoteAction(municipalityId, next);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1800);
      });
    }, 600);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-[18px] shadow">
      <div className="mb-3 text-sm font-bold">担当者メモ</div>
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-border bg-bg px-2.5 py-2 text-sm"
        placeholder="この市町村に関する所感・引継ぎ事項などを記録"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
      <p className="mt-1.5 text-[11px] text-ink-faint">
        {isPending ? "保存中..." : status === "saved" ? "Supabaseに保存しました" : "入力すると自動保存されます（Supabase）。"}
      </p>
    </div>
  );
}

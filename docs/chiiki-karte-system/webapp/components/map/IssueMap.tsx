"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import { ISSUE_CATEGORIES, IssueCategoryKey, Municipality, REGION_LABELS } from "@/lib/types";
import { compositeScore, computeScores, sevHex } from "@/lib/scoring";

// 大阪府のバウンディングボックス。パン・ズームしても近隣府県が大きく映り込まないよう
// 表示範囲をここに固定する（地図コンテナのアスペクト比も大阪府の南北に長い形状に合わせている）。
const OSAKA_BOUNDS: [[number, number], [number, number]] = [
  [34.22, 135.02],
  [35.02, 135.76],
];

type CategoryOrComposite = IssueCategoryKey | "composite";

interface Props {
  municipalities: Municipality[];
}

export function IssueMap({ municipalities }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, CircleMarker>>({});
  const [category, setCategory] = useState<CategoryOrComposite>("composite");
  const router = useRouter();

  const scored = municipalities.map((m) => {
    const scores = computeScores(m);
    return { muni: m, scores, composite: compositeScore(scores) };
  });

  function scoreOf(id: string, cat: CategoryOrComposite): number {
    const entry = scored.find((s) => s.muni.id === id);
    if (!entry) return 0;
    return cat === "composite" ? entry.composite : entry.scores[cat];
  }

  function popupHtml(id: string, cat: CategoryOrComposite): string {
    const entry = scored.find((s) => s.muni.id === id);
    if (!entry) return "";
    const v = scoreOf(id, cat);
    return `
      <div style="min-width:150px;">
        <h5 style="font-size:13px;margin:0 0 4px;">${entry.muni.name}</h5>
        <div style="font-size:11px;color:var(--ink-muted);margin-bottom:8px;">${REGION_LABELS[entry.muni.region]}</div>
        <div style="font-size:12px;margin-bottom:2px;">表示中の指標スコア：<b>${v.toFixed(1)}</b></div>
        <div style="font-size:12px;">総合スコア：<b>${entry.composite.toFixed(1)}</b> / 5.0</div>
        <button type="button" data-goto="${entry.muni.id}" style="margin-top:8px;width:100%;padding:6px 10px;border-radius:7px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">市町村カルテを見る</button>
      </div>`;
  }

  useEffect(() => {
    let disposed = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current, {
        maxBounds: L.latLngBounds(OSAKA_BOUNDS),
        maxBoundsViscosity: 1.0,
        maxZoom: 17,
      });
      L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
        attribution:
          '<a href="https://maps.gsi.go.jp/development/ich.html" target="_blank" rel="noopener">地図: 国土地理院</a>',
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];
      scored.forEach(({ muni, composite }) => {
        const r = Math.max(6, Math.min(16, Math.sqrt(muni.population) / 40));
        const marker = L.circleMarker([muni.lat, muni.lng], {
          radius: r,
          color: "#fff",
          weight: 2,
          fillColor: sevHex(composite),
          fillOpacity: 0.88,
        }).addTo(map);
        marker.bindPopup(popupHtml(muni.id, "composite"));
        marker.on("popupopen", (e) => {
          const el = e.popup.getElement()?.querySelector<HTMLButtonElement>("[data-goto]");
          el?.addEventListener("click", () => router.push(`/karte/${muni.id}`));
        });
        markersRef.current[muni.id] = marker;
        bounds.push([muni.lat, muni.lng]);
      });

      map.fitBounds(bounds, { padding: [20, 20] });
      map.setMinZoom(map.getZoom());
      mapRef.current = map;
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // カテゴリ変更時にマーカーの色だけ再計算する
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const v = scoreOf(id, category);
      marker.setStyle({ fillColor: sevHex(v) });
      marker.setPopupContent(popupHtml(id, category));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <label className="flex w-[220px] flex-col gap-1 text-xs font-semibold text-ink-muted">
          <span>表示する指標</span>
          <select
            className="rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-ink"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryOrComposite)}
          >
            <option value="composite">総合スコア</option>
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-3.5 text-[11.5px] text-ink-muted">
          <span>課題の度合い：</span>
          {["低い", "", "", "", "高い"].map((label, i) => (
            <span key={i} className="flex items-center gap-1">
              <i className="inline-block h-3.5 w-3.5 rounded" style={{ background: sevHex(i + 1) }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div
        ref={mapDivRef}
        className="mx-auto overflow-hidden rounded-2xl border border-border bg-surface-2 shadow"
        style={{ width: "min(560px, 100%)", aspectRatio: "2 / 3", maxHeight: 760, minHeight: 420 }}
      />
      <p className="mt-2.5 text-center text-[11px] text-ink-faint">
        地図データ：国土地理院（
        <a
          className="underline"
          href="https://maps.gsi.go.jp/development/ich.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          地理院タイル
        </a>
        ）
      </p>
    </div>
  );
}

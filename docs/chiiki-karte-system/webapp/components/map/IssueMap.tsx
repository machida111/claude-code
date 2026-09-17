"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, Layer } from "leaflet";
import type { FeatureCollection } from "geojson";
import { ISSUE_CATEGORIES, IssueCategoryKey, Municipality, REGION_LABELS } from "@/lib/types";
import { compositeScore, computeScores, sevHex } from "@/lib/scoring";

type CategoryOrComposite = IssueCategoryKey | "composite";

interface Props {
  municipalities: Municipality[];
}

export function IssueMap({ municipalities }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const geoLayerRef = useRef<LeafletGeoJSON | null>(null);
  const layerByIdRef = useRef<Record<string, Layer>>({});
  const [category, setCategory] = useState<CategoryOrComposite>("composite");
  const router = useRouter();

  const scored = municipalities.map((m) => {
    const scores = computeScores(m);
    return { muni: m, scores, composite: compositeScore(scores) };
  });
  const byId = new Map(scored.map((s) => [s.muni.id, s]));

  function scoreOf(id: string, cat: CategoryOrComposite): number {
    const entry = byId.get(id);
    if (!entry) return 0;
    return cat === "composite" ? entry.composite : entry.scores[cat];
  }

  function popupHtml(id: string, cat: CategoryOrComposite): string {
    const entry = byId.get(id);
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
      const [L, geojson] = await Promise.all([
        import("leaflet").then((m) => m.default),
        fetch("/osaka-municipalities.geojson").then((r) => r.json() as Promise<FeatureCollection>),
      ]);
      if (disposed || !mapDivRef.current || mapRef.current) return;

      const map = L.map(mapDivRef.current, { maxZoom: 17, scrollWheelZoom: true });
      L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
        attribution:
          '<a href="https://maps.gsi.go.jp/development/ich.html" target="_blank" rel="noopener">地図: 国土地理院</a>',
        maxZoom: 18,
      }).addTo(map);

      const geoLayer = L.geoJSON(geojson, {
        style: (feature) => {
          const id = feature?.properties?.id as string;
          return { fillColor: sevHex(scoreOf(id, "composite")), fillOpacity: 0.82, color: "#fff", weight: 1.2 };
        },
        onEachFeature: (feature, layer) => {
          const id = feature.properties.id as string;
          layer.bindPopup(popupHtml(id, "composite"));
          layer.on("mouseover", () => (layer as any).setStyle({ weight: 2.4, color: "#1F5C99" }));
          layer.on("mouseout", () => (layer as any).setStyle({ weight: 1.2, color: "#fff" }));
          layer.on("popupopen", (e: any) => {
            const el = e.popup.getElement()?.querySelector("[data-goto]") as HTMLButtonElement | null;
            el?.addEventListener("click", () => router.push(`/karte/${id}`));
          });
          layerByIdRef.current[id] = layer;
        },
      }).addTo(map);

      // 表示範囲・パン可能範囲を大阪府のポリゴン外形にほぼ固定し、隣接府県が大きく見えないようにする
      const bounds = geoLayer.getBounds();
      map.fitBounds(bounds, { padding: [16, 16] });
      map.setMaxBounds(bounds.pad(0.06));
      map.setMinZoom(map.getZoom());

      geoLayerRef.current = geoLayer;
      mapRef.current = map;
    })();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // カテゴリ変更時に塗り色だけ再計算する
  useEffect(() => {
    Object.entries(layerByIdRef.current).forEach(([id, layer]) => {
      const v = scoreOf(id, category);
      (layer as any).setStyle({ fillColor: sevHex(v) });
      (layer as any).bindPopup(popupHtml(id, category));
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
        ） ／ 行政区域境界：国土数値情報（行政区域データ N03）
      </p>
    </div>
  );
}

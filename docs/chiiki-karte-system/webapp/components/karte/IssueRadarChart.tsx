"use client";

import { useEffect, useRef } from "react";
import type { Chart as ChartT } from "chart.js";
import { ISSUE_CATEGORIES, IssueScores } from "@/lib/types";

export function IssueRadarChart({ name, scores }: { name: string; scores: IssueScores }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartT | null>(null);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const { Chart, RadarController, LineElement, PointElement, RadialLinearScale, Filler, Legend, Tooltip } =
        await import("chart.js");
      Chart.register(RadarController, LineElement, PointElement, RadialLinearScale, Filler, Legend, Tooltip);

      if (disposed || !canvasRef.current) return;
      chartRef.current?.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "radar",
        data: {
          labels: ISSUE_CATEGORIES.map((c) => c.label),
          datasets: [
            {
              label: name,
              data: ISSUE_CATEGORIES.map((c) => scores[c.key]),
              backgroundColor: "rgba(31,92,153,.18)",
              borderColor: "#1F5C99",
              pointBackgroundColor: "#1F5C99",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 0,
              max: 5,
              ticks: { stepSize: 1, backdropColor: "transparent" },
            },
          },
        },
      });
    })();

    return () => {
      disposed = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [name, scores]);

  return (
    <div className="relative h-[220px]">
      <canvas ref={canvasRef} />
    </div>
  );
}

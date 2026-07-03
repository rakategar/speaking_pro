"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

type TrendChartProps = {
  labels: string[];
  scores: number[];
};

/**
 * The real Performance Trend chart -- replaces the mockup's dead Chart.js
 * script + decorative SVG with a live react-chartjs-2 line bound to
 * score_history, keeping the mockup's exact styling (brand-aqua line,
 * gradient fill, navy tooltip).
 */
export function TrendChart({ labels, scores }: TrendChartProps) {
  return (
    <div className="h-48 w-full relative">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Overall Score",
              data: scores,
              borderColor: "#00E5FF",
              backgroundColor: (context: ScriptableContext<"line">) => {
                const { ctx, chartArea } = context.chart;
                if (!chartArea) return "rgba(0, 229, 255, 0.1)";
                const gradient = ctx.createLinearGradient(
                  0,
                  chartArea.top,
                  0,
                  chartArea.bottom,
                );
                gradient.addColorStop(0, "rgba(0, 229, 255, 0.2)");
                gradient.addColorStop(1, "rgba(0, 229, 255, 0)");
                return gradient;
              },
              borderWidth: 3,
              pointBackgroundColor: "#FFFFFF",
              pointBorderColor: "#00E5FF",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.4,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0A192F",
              titleFont: { family: "Plus Jakarta Sans", size: 12 },
              bodyFont: {
                family: "Plus Jakarta Sans",
                size: 14,
                weight: "bold",
              },
              padding: 12,
              cornerRadius: 8,
              displayColors: false,
            },
          },
          scales: {
            y: {
              beginAtZero: false,
              min: Math.max(0, Math.min(...scores, 60) - 10),
              max: 100,
              grid: { color: "#E2E8F0" },
              border: { display: false, dash: [5, 5] },
              ticks: {
                font: { family: "Plus Jakarta Sans", size: 11 },
                color: "#64748B",
                stepSize: 10,
              },
            },
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                font: { family: "Plus Jakarta Sans", size: 12 },
                color: "#64748B",
              },
            },
          },
          interaction: { intersect: false, mode: "index" },
        }}
      />
    </div>
  );
}

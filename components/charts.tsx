"use client";

import {
  Chart as ChartJS, ArcElement, BarController, LineController, BarElement, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Chart, Doughnut } from "react-chartjs-2";
import { formatNumber } from "@/lib/demo-data";

ChartJS.register(ArcElement, BarController, LineController, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = "Arial, Helvetica, sans-serif";
ChartJS.defaults.color = "#7a899c";
ChartJS.defaults.font.size = 10;

export function MonthlyChart({ total, mode }: { total: number; mode: string }) {
  const weights = [0.08, 0.11, 0.14, 0.18, 0.23, 0.26];
  const counts = weights.map(w => Math.round(w * total));
  const progress = weights.map((_, i) => Math.round(weights.slice(0, i + 1).reduce((a, b) => a + b, 0) * 100));
  return <Chart type="bar" data={{
    labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
    datasets: [
      { type: "bar", label: mode === "cumulative" ? "Cumulative surveys" : "Confirmed surveys", data: mode === "cumulative" ? counts.map((_, i) => counts.slice(0, i + 1).reduce((a, b) => a + b, 0)) : counts, backgroundColor: "#3d8fe8", borderRadius: 4, barPercentage: 0.67, yAxisID: "y", order: 2 },
      { type: "line", label: "Share of period total (%)", data: progress, borderColor: "#0caa8c", backgroundColor: "#0caa8c", pointBackgroundColor: "#fff", pointBorderWidth: 2, pointRadius: 3, borderWidth: 2, tension: 0.35, yAxisID: "y1", order: 1 },
    ],
  }} options={{
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#142e4b", padding: 11 } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: "#edf1f6" }, border: { display: false }, ticks: { maxTicksLimit: 5, callback: v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : v } },
      y1: { position: "right", min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { stepSize: 25, callback: v => `${v}%` } },
    },
  }} />;
}

export function DonutChart({ values, colors, total, label }: { values: number[]; colors: string[]; total: number; label: string }) {
  return <div className="donut-wrap">
    <Doughnut data={{ labels: label === "Surveyors" ? ["Active", "On leave", "Unassigned"] : label === "Surveys" ? ["Complete", "Needs review", "Incomplete"] : ["Running", "Off season", "Temporarily closed", "Permanently closed"], datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4, spacing: 2 }] }}
      options={{ cutout: "77%", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: "#142e4b" } } }} />
    <div className="donut-center"><strong>{formatNumber(total)}</strong><span>{label}</span></div>
  </div>;
}

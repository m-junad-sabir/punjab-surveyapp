export type Division = {
  name: string;
  districts: number;
  assigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  active: number;
  enumerators: number;
  lat: number;
  lng: number;
};

// Synthetic presentation fixtures, not a database extract or official survey results.
export const divisions: Division[] = [
  { name: "Rawalpindi", districts: 4, assigned: 14850, completed: 9217, inProgress: 4700, pending: 933, active: 43, enumerators: 50, lat: 33.25, lng: 73.05 },
  { name: "Gujranwala", districts: 5, assigned: 22430, completed: 15921, inProgress: 5600, pending: 909, active: 58, enumerators: 65, lat: 32.25, lng: 74.15 },
  { name: "Gujrat", districts: 4, assigned: 10620, completed: 6903, inProgress: 3250, pending: 467, active: 34, enumerators: 39, lat: 32.65, lng: 73.65 },
  { name: "Lahore", districts: 4, assigned: 28750, completed: 20736, inProgress: 7000, pending: 1014, active: 78, enumerators: 85, lat: 31.25, lng: 74.1 },
  { name: "Sargodha", districts: 4, assigned: 12410, completed: 7205, inProgress: 4500, pending: 705, active: 39, enumerators: 45, lat: 32.15, lng: 72.25 },
  { name: "Faisalabad", districts: 4, assigned: 18950, completed: 13067, inProgress: 5000, pending: 883, active: 51, enumerators: 58, lat: 31.25, lng: 72.85 },
  { name: "Sahiwal", districts: 3, assigned: 8620, completed: 5431, inProgress: 2650, pending: 539, active: 26, enumerators: 31, lat: 30.55, lng: 73.2 },
  { name: "Multan", districts: 4, assigned: 14320, completed: 9470, inProgress: 4100, pending: 750, active: 37, enumerators: 43, lat: 30.1, lng: 71.7 },
  { name: "Bahawalpur", districts: 3, assigned: 9740, completed: 5936, inProgress: 3200, pending: 604, active: 28, enumerators: 33, lat: 29.1, lng: 72.15 },
  { name: "D.G. Khan", districts: 4, assigned: 13180, completed: 7776, inProgress: 4600, pending: 804, active: 31, enumerators: 37, lat: 30.3, lng: 70.45 },
];

export const formatNumber = (n: number) => new Intl.NumberFormat("en-PK").format(n);
export const completion = (d: Division) => Math.round(d.completed / d.assigned * 100);
export const progressColor = (percent: number) => percent >= 70 ? "#12a889" : percent >= 65 ? "#4198e4" : percent >= 60 ? "#e8b44d" : "#e58d88";

export type SurveyStatus = "CONFIRMED" | "PENDING_CONFIRMATION" | "DRAFT" | "RETURNED" | "REJECTED";
export type SurveyRecord = {
  id: string;
  division: string;
  district: string;
  tehsil: string;
  name: string;
  surveyor: string;
  status: SurveyStatus;
  submitted_at: string;
  operation: "RUNNING" | "OFF_SEASON" | "TEMP_CLOSED" | "PERM_CLOSED";
};

const units = [
  ["Lahore", "Lahore", "Raiwind", "Al-Falah Steel Works"],
  ["Faisalabad", "Faisalabad", "Samundri", "Hassan Textile Mills"],
  ["Gujranwala", "Gujranwala", "Kamoke", "Bright Plastics (Pvt.) Ltd."],
  ["Sargodha", "Sargodha", "Bhalwal", "ACE Food Processing"],
  ["Multan", "Multan", "Shujabad", "Ittefaq Rice Mills"],
  ["Rawalpindi", "Rawalpindi", "Taxila", "Margalla Engineering"],
  ["Bahawalpur", "Bahawalpur", "Hasilpur", "Cholistan Cotton Industries"],
  ["D.G. Khan", "Dera Ghazi Khan", "Kot Chutta", "Indus Building Materials"],
  ["Gujrat", "Gujrat", "Kharian", "Chenab Ceramics"],
  ["Sahiwal", "Sahiwal", "Chichawatni", "Green Valley Foods"],
];
const statuses: SurveyStatus[] = ["CONFIRMED", "CONFIRMED", "PENDING_CONFIRMATION", "CONFIRMED", "RETURNED", "DRAFT", "CONFIRMED", "PENDING_CONFIRMATION", "CONFIRMED", "REJECTED"];

export const records: SurveyRecord[] = Array.from({ length: 40 }, (_, i) => {
  const u = units[i % units.length];
  return {
    id: `PIS-${String(10240 + i).padStart(6, "0")}`,
    division: u[0], district: u[1], tehsil: u[2],
    name: `${u[3]}${i >= 10 ? ` - Unit ${Math.floor(i / 10) + 1}` : ""}`,
    surveyor: `EN-${String(104 + (i * 17) % 310)}`,
    status: statuses[i % statuses.length],
    submitted_at: new Date(Date.UTC(2026, 10, 3 - Math.floor(i / 10), 9, 42 - i % 10 * 4)).toISOString(),
    operation: (["RUNNING", "RUNNING", "RUNNING", "OFF_SEASON", "TEMP_CLOSED", "PERM_CLOSED"] as const)[i % 6],
  };
});

export const statusLabels: Record<SurveyStatus, string> = {
  CONFIRMED: "Confirmed",
  PENDING_CONFIRMATION: "Pending review",
  DRAFT: "Draft",
  RETURNED: "Returned",
  REJECTED: "Rejected",
};

export function summarize(rows: Division[]) {
  return rows.reduce((a, d) => ({
    assigned: a.assigned + d.assigned,
    completed: a.completed + d.completed,
    inProgress: a.inProgress + d.inProgress,
    pending: a.pending + d.pending,
    active: a.active + d.active,
    enumerators: a.enumerators + d.enumerators,
  }), { assigned: 0, completed: 0, inProgress: 0, pending: 0, active: 0, enumerators: 0 });
}

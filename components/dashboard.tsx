"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity, ArrowDownToLine, ArrowRight, Bell, Building2, CalendarDays, ChartNoAxesCombined,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleHelp, ClipboardCheck,
  ClipboardList, Clock3, Factory, FileChartColumn, FileCheck2, Flag, Globe2, LayoutDashboard,
  ListFilter, Map, MapPin, Maximize2, Menu, Search, Settings, ShieldCheck, SlidersHorizontal,
  TrendingUp, Users, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { divisions, records, summarize, completion, formatNumber as fmt, progressColor, statusLabels, type SurveyRecord, type SurveyStatus } from "@/lib/demo-data";
import { MonthlyChart, DonutChart } from "./charts";

const SurveyMap = dynamic(() => import("./survey-map"), { ssr: false, loading: () => <div className="map-loading"><Globe2 size={30} /><span>Loading Punjab survey map...</span></div> });
const navigation: { group: string; links: [string, LucideIcon][] }[] = [
  { group: "OVERVIEW", links: [["Dashboard", LayoutDashboard]] },
  { group: "FIELD OPERATIONS", links: [["Division Progress", ChartNoAxesCombined], ["District Progress", Building2], ["Enumerator Tracking", Users], ["Survey Records", ClipboardList], ["Field Quality Control", ShieldCheck]] },
  { group: "DATA & GEOGRAPHY", links: [["Industrial Units", Factory], ["GIS Mapping", Map], ["Data Validation", FileCheck2], ["Reports & Exports", FileChartColumn]] },
  { group: "ADMINISTRATION", links: [["User Management", Users], ["Settings", Settings], ["Help & Support", CircleHelp]] },
];

function Panel({ title, subtitle, icon: Icon, action, children, className = "" }: { title: string; subtitle?: string; icon?: LucideIcon; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{Icon && <Icon size={15} />}{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

function Kpi({ title, value, detail, percent, color, icon: Icon, foot }: { title: string; value: string; detail: string; percent: number; color: string; icon: LucideIcon; foot: string }) {
  return <div className="kpi"><div className="kpi-top"><span className="kpi-icon" style={{ background: `${color}14`, color }}><Icon size={21} strokeWidth={1.8} /></span><span className="kpi-trend" style={{ color }}>{foot}</span></div><p>{title}</p><strong>{value}</strong><div className="kpi-detail">{detail}</div><div className="progress-track"><span style={{ width: `${percent}%`, background: color }} /></div></div>;
}

function Status({ status }: { status: SurveyStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}><i />{statusLabels[status]}</span>;
}
function displayDate(s: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }).format(new Date(s));
}
function exportCsv(rows: SurveyRecord[]) {
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const csv = [["Survey ID", "Division", "District", "Tehsil", "Industrial unit", "Surveyor", "Status", "Submitted at"], ...rows.map(r => [r.id, r.division, r.district, r.tehsil, r.name, r.surveyor, r.status, r.submitted_at])].map(r => r.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "punjab-survey-DEMO.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Dashboard() {
  const [selected, setSelected] = useState("All divisions");
  const [nav, setNav] = useState("Dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [period, setPeriod] = useState("full");
  const [monthlyMode, setMonthlyMode] = useState("monthly");
  const [layer, setLayer] = useState("completion");
  const [detail, setDetail] = useState<SurveyRecord | null>(null);
  const [notice, setNotice] = useState(false);
  const [expandedMap, setExpandedMap] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetail(null);
        setExpandedMap(false);
        setNotice(false);
        setSidebar(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
  const chosen = divisions.filter(d => selected === "All divisions" || d.name === selected);
  const totals = summarize(chosen);
  const pct = Math.round(totals.completed / totals.assigned * 1000) / 10;
  const filtered = useMemo(() => records.filter(r =>
    (selected === "All divisions" || r.division === selected) &&
    (status === "All statuses" || r.status === status) &&
    (period === "full" || r.submitted_at.startsWith(period === "today" ? "2026-11-03" : "2026-11")) &&
    `${r.name} ${r.district} ${r.tehsil} ${r.surveyor} ${r.id}`.toLowerCase().includes(search.toLowerCase())
  ), [selected, status, period, search]);
  const changeDivision = (s: string) => { setSelected(s); setPage(0); };
  const navigate = (name: string) => { setNav(name); setSidebar(false); setPage(0); setSearch(""); setStatus("All statuses"); };
  const allRecordView = ["Survey Records", "Industrial Units", "Data Validation", "Field Quality Control"].includes(nav);
  const mapView = nav === "GIS Mapping";
  const progressView = ["Division Progress", "District Progress"].includes(nav);
  const demoNotice = ["User Management", "Settings", "Help & Support"].includes(nav);
  const donutComplete = Math.round(totals.completed * 0.837);
  const donutReview = Math.round(totals.completed * 0.125);
  const activePct = Math.round(totals.active / totals.enumerators * 1000) / 10;
  const recent = filtered.slice(page * (allRecordView ? 12 : 5), (page + 1) * (allRecordView ? 12 : 5));
  const pageSize = allRecordView ? 12 : 5;

  const mapPanel = <Panel title="Geographic coverage" subtitle="Division-wise survey completion across Punjab" icon={Map} className={`map-panel ${mapView ? "full-map" : ""} ${expandedMap ? "expanded-map" : ""}`} action={<div className="panel-actions"><select aria-label="Map layer" value={layer} onChange={e => setLayer(e.target.value)}><option value="completion">Completion %</option><option value="units">Assigned units</option></select><button className="icon-btn" title={expandedMap ? "Close expanded map" : "Expand map"} onClick={() => setExpandedMap(!expandedMap)}>{expandedMap ? <X size={15} /> : <Maximize2 size={15} />}</button></div>}>
    <SurveyMap selected={selected} onSelect={changeDivision} layer={layer} />
    <div className="map-footer"><span><i className="live-dot" />{chosen.length} divisions in view</span><button onClick={() => changeDivision("All divisions")}>Reset view <ArrowRight size={12} /></button></div>
  </Panel>;

  const summaryPanel = <Panel title="Division-wise progress" subtitle="Confirmed surveys against assigned units" icon={ChartNoAxesCombined} action={<span className="subtle-tag">{chosen.length} divisions</span>} className="summary-panel">
    <div className="table-scroll"><table className="summary-table"><thead><tr><th>DIVISION</th><th>ASSIGNED</th><th>CONFIRMED</th><th>PROGRESS</th></tr></thead><tbody>{chosen.map(d => <tr key={d.name} onClick={() => changeDivision(d.name)} tabIndex={0} role="button" aria-label={`Filter ${d.name} division`} onKeyDown={e => { if (e.key === "Enter") changeDivision(d.name); }}><td><span className="division-dot" style={{ background: progressColor(completion(d)) }} />{d.name}</td><td>{fmt(d.assigned)}</td><td>{fmt(d.completed)}</td><td><div className="table-progress"><div><span style={{ width: `${completion(d)}%`, background: progressColor(completion(d)) }} /></div><b>{completion(d)}%</b></div></td></tr>)}</tbody><tfoot><tr><td>Punjab total</td><td>{fmt(totals.assigned)}</td><td>{fmt(totals.completed)}</td><td>{pct}%</td></tr></tfoot></table></div>
    <div className="panel-footnote"><span><span className="tiny-dot" />Click a division to explore its survey activity</span></div>
  </Panel>;

  const surveysPanel = <Panel title={allRecordView ? nav : "Recent survey submissions"} subtitle={allRecordView ? "Search and inspect the demonstration survey register" : "Latest field submissions and review status"} icon={ClipboardList} className="surveys-panel" action={<button className="text-btn" onClick={() => allRecordView ? exportCsv(filtered) : navigate("Survey Records")}>{allRecordView ? "Export CSV" : "View all"}<ArrowRight size={13} /></button>}>
    {allRecordView && <div className="record-controls"><div className="search-field"><Search size={15} /><input placeholder="Search unit, district, surveyor..." aria-label="Search survey records" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div><select aria-label="Survey status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option>All statuses</option>{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}
    <div className="table-scroll"><table className="records-table"><thead><tr><th>DATE & TIME</th><th>DISTRICT / TEHSIL</th><th>INDUSTRIAL UNIT</th><th>SURVEYOR</th><th>STATUS</th><th /></tr></thead><tbody>{recent.map(r => <tr key={r.id} onClick={() => setDetail(r)}><td>{displayDate(r.submitted_at)}<span className="cell-secondary">2026 · PKT</span></td><td>{r.district}<span className="cell-secondary">{r.tehsil}</span></td><td><b>{r.name}</b><span className="cell-secondary">{r.id}</span></td><td><span className="surveyor-badge">{r.surveyor}</span></td><td><Status status={r.status} /></td><td><button className="icon-btn" aria-label={`View ${r.name}`} onClick={e => { e.stopPropagation(); setDetail(r); }}><ChevronRight size={15} /></button></td></tr>)}</tbody></table>{recent.length === 0 && <div className="empty-state"><Search size={26} /><h3>No matching submissions</h3><p>Try another division, status, or search term.</p></div>}</div>
    <div className="table-footer"><span>Showing {filtered.length ? page * pageSize + 1 : 0}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} demo records</span><div><button className="icon-btn" disabled={page === 0} aria-label="Previous page" onClick={() => setPage(page - 1)}><ChevronLeft size={15} /></button><span>{page + 1}</span><button className="icon-btn" disabled={(page + 1) * pageSize >= filtered.length} aria-label="Next page" onClick={() => setPage(page + 1)}><ChevronRight size={15} /></button></div></div>
  </Panel>;

  return <div className="app-shell">
    {sidebar && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebar(false)} />}
    <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
      <a className="brand" href="/" aria-label="Punjab Industries dashboard"><span className="brand-mark"><Factory size={27} strokeWidth={1.5} /><span className="brand-mark-ring" /></span><span><b>INDUSTRIES</b><small>GOVERNMENT OF PUNJAB</small></span></a>
      <div className="workspace-label"><span className="workspace-avatar">PI</span><div><b>Punjab Industrial Survey</b><small>Field monitoring workspace</small></div><ChevronDown size={13} /></div>
      <nav>{navigation.map(group => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.links.map(([name, Icon]) => <button key={name} onClick={() => navigate(name)} className={`nav-link ${nav === name ? "active" : ""}`}><Icon size={17} strokeWidth={1.7} /><span>{name}</span>{name === "Dashboard" && <span className="nav-active-dot" />}{name === "Data Validation" && <span className="nav-count">12</span>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="survey-round"><span><i className="live-dot" />SURVEY ROUND 2026</span><b>Building Punjab&apos;s industrial future.</b><div className="sidebar-round-progress"><span /></div><small>Demonstration workspace</small></div><div className="partner"><span className="nespak-mark">N</span><span>NESPAK<small>Engineering a better tomorrow</small></span><ShieldCheck size={17} /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setSidebar(true)}><Menu size={21} /></button><div className="breadcrumb">Punjab Industrial Survey <ChevronRight size={12} /><span>{nav}</span></div></div><div className="topbar-right"><span className="prototype-badge"><i />DEMO PROTOTYPE</span><div className="notification-wrap"><button className="notification-btn" aria-label="Notifications" onClick={() => setNotice(!notice)}><Bell size={19} /><i /></button>{notice && <div className="notification-popover"><b>Field activity preview</b><p>{filtered.length} demo submissions are available for the selected filters.</p><small>This is a prototype. No live alerts are connected.</small></div>}</div><div className="header-divider" /><div className="user-avatar">PM</div><div className="user-info"><b>Project Manager</b><span>Directorate of Industries</span></div></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow"><span />FIELD MONITORING DASHBOARD</div><h1>{nav === "Dashboard" ? "Industrial Survey - Punjab" : nav}</h1><p>One province. Every industry. <span>A clearer picture of progress.</span></p></div><button className="btn btn-white" onClick={() => exportCsv(filtered)}><ArrowDownToLine size={15} />Export report</button></div>
        <div className="filter-bar"><div className="filter-left"><span className="filter-label"><SlidersHorizontal size={15} />Filter by</span><label className="filter-select"><MapPin size={14} /><select aria-label="Division" value={selected} onChange={e => changeDivision(e.target.value)}><option>All divisions</option>{divisions.map(d => <option key={d.name}>{d.name}</option>)}</select></label><label className="filter-select date-select"><CalendarDays size={14} /><select aria-label="Reporting period" value={period} onChange={e => { setPeriod(e.target.value); setPage(0); }}><option value="full">01 Jun - 03 Nov 2026</option><option value="2026-11">November 2026</option><option value="today">03 Nov 2026 only</option></select></label>{(selected !== "All divisions" || period !== "full") && <button className="text-btn" onClick={() => { changeDivision("All divisions"); setPeriod("full"); }}>Reset <X size={12} /></button>}</div><span className="snapshot-label"><i className="live-dot" />Demo snapshot · 03 Nov 2026</span></div>
        {period !== "full" && <div className="filter-note"><ListFilter size={14} />Date filter applies to the submission register and activity log. Coverage indicators are cumulative demo totals.</div>}
        <div className="kpi-grid">
          <Kpi title="Total industrial units" value={fmt(totals.assigned)} detail="Assigned survey universe" percent={100} color="#327bd3" icon={Factory} foot="TARGET" />
          <Kpi title="Surveys confirmed" value={fmt(totals.completed)} detail={`${pct}% of assigned units`} percent={pct} color="#11a57c" icon={CircleCheck} foot={`${pct}%`} />
          <Kpi title="In progress" value={fmt(totals.inProgress)} detail="Draft / fieldwork underway" percent={totals.inProgress / totals.assigned * 100} color="#ed9738" icon={Clock3} foot="IN FIELD" />
          <Kpi title="Awaiting survey" value={fmt(totals.pending)} detail="Assigned units not yet visited" percent={totals.pending / totals.assigned * 100} color="#e16872" icon={ClipboardList} foot="PENDING" />
          <Kpi title="Active enumerators" value={`${totals.active} / ${totals.enumerators}`} detail={`${activePct}% deployment rate`} percent={activePct} color="#8c63d7" icon={Users} foot="DEPLOYED" />
          <Kpi title="Days elapsed" value="156 / 334" detail="01 Jun 2026 - 30 Apr 2027" percent={46.7} color="#2a669c" icon={CalendarDays} foot="46.7%" />
        </div>
        {demoNotice ? <Panel title={nav} icon={CircleHelp} className="information-panel"><span className="info-hero"><ShieldCheck size={35} /></span><h2>{nav === "Help & Support" ? "Your survey command center" : `${nav} preview`}</h2><p>{nav === "Help & Support" ? "Explore the dashboard, click a division on the map, filter survey records, open a submission, and export a CSV for your client demonstration." : "This presentation prototype is read-only. User administration and persistent configuration will be connected with the authenticated backend in the next phase."}</p><button className="btn btn-primary" onClick={() => navigate("Dashboard")}>Back to dashboard <ArrowRight size={15} /></button></Panel> :
        allRecordView ? surveysPanel :
        mapView ? mapPanel :
        nav === "Enumerator Tracking" ? <Panel title="Enumerator deployment by division" icon={Users}><div className="table-scroll"><table className="deployment-table"><thead><tr><th>DIVISION</th><th>ASSIGNED</th><th>ACTIVE</th><th>NOT ACTIVE</th><th>DEPLOYMENT</th></tr></thead><tbody>{chosen.map(d => <tr key={d.name}><td>{d.name}</td><td>{d.enumerators}</td><td>{d.active}</td><td>{d.enumerators - d.active}</td><td><span className="status status-confirmed">{Math.round(d.active / d.enumerators * 100)}%</span></td></tr>)}</tbody></table></div></Panel> :
        nav === "Reports & Exports" ? <Panel title="Survey reporting center" icon={FileChartColumn} className="reports-panel"><div className="report-card"><FileChartColumn size={35} /><h3>Survey submission register</h3><p>Download {filtered.length} demonstration records for {selected.toLowerCase()}. Includes geography, unit details, surveyor and review status.</p><button className="btn btn-primary" onClick={() => exportCsv(filtered)}><ArrowDownToLine size={16} />Download CSV</button><small>Sample data only · CSV format · Current filters applied</small></div></Panel> :
        <><div className={`dashboard-grid ${progressView ? "progress-view" : ""}`}>
          {mapPanel}{summaryPanel}
          <Panel title="Monthly progress" subtitle="Confirmed survey trend · Jun - Nov 2026" icon={TrendingUp} className="monthly-panel" action={<select aria-label="Monthly chart metric" value={monthlyMode} onChange={e => setMonthlyMode(e.target.value)}><option value="monthly">Monthly</option><option value="cumulative">Cumulative</option></select>}><div className="monthly-highlight"><strong>{fmt(Math.round(totals.completed * 0.26))}</strong><span><TrendingUp size={12} />November sample</span></div><div className="monthly-chart"><MonthlyChart total={totals.completed} mode={monthlyMode} /></div><div className="chart-legend"><span><i style={{ background: "#3d8fe8" }} />Confirmed surveys</span><span><i className="line-key" />Share of period total</span></div></Panel>
          <div className="donut-grid">
            <Panel title="Enumerator deployment" className="donut-panel" action={<Users size={15} />}><div className="donut-content"><DonutChart values={[totals.active, Math.round((totals.enumerators - totals.active) * 0.48), totals.enumerators - totals.active - Math.round((totals.enumerators - totals.active) * 0.48)]} colors={["#20b889", "#4b9beb", "#f5b954"]} total={totals.enumerators} label="Surveyors" /><div className="donut-legend"><LegendItem color="#20b889" label="Active" value={`${totals.active} (${activePct}%)`} /><LegendItem color="#4b9beb" label="On leave" value={fmt(Math.round((totals.enumerators - totals.active) * 0.48))} /><LegendItem color="#f5b954" label="Unassigned" value={fmt(totals.enumerators - totals.active - Math.round((totals.enumerators - totals.active) * 0.48))} /></div></div></Panel>
            <Panel title="Questionnaire completeness" className="donut-panel" action={<ClipboardCheck size={15} />}><div className="donut-content"><DonutChart values={[donutComplete, donutReview, totals.completed - donutComplete - donutReview]} colors={["#20b889", "#f5c655", "#ef787e"]} total={totals.completed} label="Surveys" /><div className="donut-legend"><LegendItem color="#20b889" label="90% and above" value={`${fmt(donutComplete)} (83.7%)`} /><LegendItem color="#f5c655" label="70% - 89%" value={`${fmt(donutReview)} (12.5%)`} /><LegendItem color="#ef787e" label="Below 70%" value={fmt(totals.completed - donutComplete - donutReview)} /></div></div></Panel>
            <Panel title="Industrial operation status" className="donut-panel" action={<Factory size={15} />}><div className="donut-content"><DonutChart values={[Math.round(totals.assigned * 0.766), Math.round(totals.assigned * 0.102), Math.round(totals.assigned * 0.051), totals.assigned - Math.round(totals.assigned * 0.766) - Math.round(totals.assigned * 0.102) - Math.round(totals.assigned * 0.051)]} colors={["#20b889", "#f5c655", "#4b9beb", "#b2bdcc"]} total={totals.assigned} label="Units" /><div className="donut-legend"><LegendItem color="#20b889" label="Running" value="76.6%" /><LegendItem color="#f5c655" label="Off season" value="10.2%" /><LegendItem color="#4b9beb" label="Temporarily closed" value="5.1%" /><LegendItem color="#b2bdcc" label="Permanently closed" value="8.1%" /></div></div></Panel>
          </div>
        </div><div className="bottom-grid">{surveysPanel}<Panel title="Field activity log" subtitle="Latest actions from the survey workspace" icon={Activity} action={<span className="subtle-tag">DEMO</span>} className="activity-panel"><div className="activity-list">{filtered.slice(0, 5).map((r, i) => <button className="activity-item" key={r.id} onClick={() => setDetail(r)}><span className={`activity-icon activity-${i % 3}`}>{i % 3 === 0 ? <Check size={13} /> : i % 3 === 1 ? <ClipboardCheck size={13} /> : <Flag size={13} />}</span><div><p><b>{r.surveyor}</b> {r.status === "CONFIRMED" ? "confirmed a survey" : r.status === "PENDING_CONFIRMATION" ? "submitted for review" : "updated a survey"}</p><span>{r.name} · {r.district}</span></div><time>{new Date(r.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })}</time></button>)}{filtered.length === 0 && <p className="empty-state">No activity for the selected filters.</p>}</div><div className="activity-footer"><ShieldCheck size={13} />Schema-aligned review workflow</div></Panel></div></>}
        <footer className="page-footer"><span>Directorate General of Industries, Punjab <i />Technical partner: <b>NESPAK</b></span><span>Prototype v0.1 <i />Synthetic data · Not connected to live DB</span></footer>
      </main>
    </div>
    {detail && <div className="modal-backdrop" onClick={() => setDetail(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="kpi-icon"><Factory size={25} /></span><button className="icon-btn" autoFocus aria-label="Close survey details" onClick={() => setDetail(null)}><X size={20} /></button></div><span className="eyebrow">SURVEY SUBMISSION · DEMONSTRATION</span><h2 id="detail-title">{detail.name}</h2><p className="detail-id">{detail.id}</p><Status status={detail.status} /><dl>{[["Division", detail.division], ["District", detail.district], ["Tehsil", detail.tehsil], ["Surveyor", detail.surveyor], ["Submitted", `${displayDate(detail.submitted_at)} 2026 (PKT)`], ["Operation status", detail.operation.replaceAll("_", " ")]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><div className="modal-notice"><ShieldCheck size={16} /><span>Workflow follows survey_responses.status in the supplied schema. This record is synthetic and read-only.</span></div><button className="btn btn-primary" onClick={() => setDetail(null)}>Close details</button></section></div>}
  </div>;
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="legend-item"><i style={{ background: color }} /><div><span>{label}</span><b>{value}</b></div></div>;
}

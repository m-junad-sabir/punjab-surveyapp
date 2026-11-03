"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip, CircleMarker, useMap } from "react-leaflet";
import type { FeatureCollection } from "geojson";
import type { Layer, Path, LeafletMouseEvent } from "leaflet";
import { divisions, completion, progressColor, formatNumber } from "@/lib/demo-data";

const districtDivisions: Record<string, string> = {
  rawalpindi: "Rawalpindi", attock: "Rawalpindi", chakwal: "Rawalpindi", jhelum: "Rawalpindi",
  gujrat: "Gujrat", mandibahauddin: "Gujrat", hafizabad: "Gujrat",
  gujranwala: "Gujranwala", sialkot: "Gujranwala", narowal: "Gujranwala",
  lahore: "Lahore", kasur: "Lahore", sheikhupura: "Lahore", sheikhpura: "Lahore", nankanasahib: "Lahore", nankana: "Lahore",
  faisalabad: "Faisalabad", jhang: "Faisalabad", tobateksingh: "Faisalabad", chiniot: "Faisalabad",
  sargodha: "Sargodha", khushab: "Sargodha", mianwali: "Sargodha", bhakkar: "Sargodha",
  sahiwal: "Sahiwal", okara: "Sahiwal", pakpattan: "Sahiwal",
  multan: "Multan", khanewal: "Multan", lodhran: "Multan", vehari: "Multan", vihari: "Multan",
  bahawalpur: "Bahawalpur", bahawalnagar: "Bahawalpur", rahimyarkhan: "Bahawalpur",
  deraghazikhan: "D.G. Khan", dgkhan: "D.G. Khan", muzaffargarh: "D.G. Khan", layyah: "D.G. Khan", rajanpur: "D.G. Khan",
};
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
function FitView({ selected }: { selected: string }) {
  const map = useMap();
  useEffect(() => {
    const d = divisions.find(d => d.name === selected);
    if (d) map.flyTo([d.lat, d.lng], 8, { duration: 0.7 });
    else map.flyTo([31.1, 72.25], 6.3, { duration: 0.7 });
  }, [selected, map]);
  return null;
}

export default function SurveyMap({ selected, onSelect, layer }: { selected: string; onSelect: (name: string) => void; layer: string }) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch("/data/pakistan-districts.geojson", { signal: abort.signal })
      .then(r => { if (!r.ok) throw new Error(`Map boundary request failed (${r.status})`); return r.json(); })
      .then((data: FeatureCollection) => setGeo({ ...data, features: data.features.filter(f => districtDivisions[normalize(String(f.properties?.shapeName ?? ""))]) }))
      .catch((e: Error) => { if (e.name !== "AbortError") { console.error(e); setError("District boundaries could not be loaded. Survey location markers are still available."); } });
    return () => abort.abort();
  }, []);
  return <div className="map-canvas">
    {error && <div className="map-error" role="alert">{error}</div>}
    <MapContainer center={[31.1, 72.25]} zoom={6.3} zoomSnap={0.1} minZoom={5} maxZoom={12} scrollWheelZoom={false} attributionControl={true} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.38} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {geo && <GeoJSON key={`${selected}-${layer}`} data={geo} style={feature => {
        const name = districtDivisions[normalize(String(feature?.properties?.shapeName ?? ""))];
        const d = divisions.find(d => d.name === name);
        return { color: "#fff", weight: 1.2, fillColor: d ? progressColor(completion(d)) : "#b5c3d0", fillOpacity: selected === "All divisions" || selected === name ? 0.58 : 0.12 };
      }} onEachFeature={(feature, leafletLayer: Layer) => {
        const name = districtDivisions[normalize(String(feature.properties?.shapeName ?? ""))];
        const d = divisions.find(d => d.name === name);
        if (!d) return;
        leafletLayer.bindTooltip(`${feature.properties?.shapeName} · ${d.name} division · ${completion(d)}% confirmed`);
        leafletLayer.on({ click: () => onSelect(d.name), mouseover: (e: LeafletMouseEvent) => (e.target as Path).setStyle({ weight: 2, color: "#3269a1" }), mouseout: (e: LeafletMouseEvent) => (e.target as Path).setStyle({ weight: 1.2, color: "#fff" }) });
      }} />}
      {divisions.filter(d => selected === "All divisions" || selected === d.name).map(d => <CircleMarker key={d.name} center={[d.lat, d.lng]} radius={layer === "units" ? 6 + d.assigned / 3000 : 4} pathOptions={{ fillColor: "#123d66", fillOpacity: 0.9, color: "#fff", weight: 2 }} eventHandlers={{ click: () => onSelect(d.name) }}>
        <Tooltip permanent direction="top" offset={[0, -5]} className="division-label"><strong>{d.name}</strong><span>{layer === "units" ? formatNumber(d.assigned) : `${completion(d)}%`}</span></Tooltip>
      </CircleMarker>)}
      <FitView selected={selected} />
    </MapContainer>
    <div className="map-north"><span>&#9650;</span>N</div>
    <div className="map-legend"><b>Survey completion</b>{[["#e58d88", "< 60%"], ["#e8b44d", "60 - 64%"], ["#4198e4", "65 - 69%"], ["#12a889", "70% +"]].map(([color, label]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>
    <div className="map-source">District geography: geoBoundaries · Demo division grouping</div>
  </div>;
}

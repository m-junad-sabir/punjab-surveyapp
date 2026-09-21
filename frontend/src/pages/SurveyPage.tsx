import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { getDeviceId } from '../lib/deviceId';
import { getSubmission, saveSubmission } from '../lib/db';
import type { SurveySectionKey, SurveySubmissionDraft } from '../types';

type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'select' | 'boolean' | 'gps' | 'photo';
type Field = { key: string; code: string; label: string; type?: FieldType; required?: boolean; options?: string[]; min?: number; max?: number };
type Grid = { key: string; label: string; columns: Field[] };
type Definition = { key: SurveySectionKey; title: string; fields: Field[]; grid?: Grid };

const punjabLocations: Record<string, Record<string, string[]>> = {
  Lahore: { 'Lahore District': ['Lahore City', 'Model Town', 'Raiwind', 'Shalimar'] },
  Kasur: { 'Kasur District': ['Kasur', 'Chunian', 'Kot Radha Kishan', 'Pattoki'] },
  Sheikhupura: { 'Sheikhupura District': ['Sheikhupura', 'Ferozewala', 'Muridke', 'Safdarabad', 'Sharaqpur'] },
  Nankana: { 'Nankana Sahib District': ['Nankana Sahib', 'Shahkot', 'Sangla Hill'] },
  Faisalabad: { 'Faisalabad District': ['Faisalabad City', 'Jaranwala', 'Samundri', 'Tandlianwala'] },
  Jhang: { 'Jhang District': ['Jhang', 'Shorkot', 'Ahmadpur Sial'] },
  TobaTekSingh: { 'Toba Tek Singh District': ['Toba Tek Singh', 'Gojra', 'Kamalia', 'Pir Mahal'] },
  Chiniot: { 'Chiniot District': ['Chiniot', 'Bhawana', 'Lalian'] },
  Gujranwala: { 'Gujranwala District': ['Gujranwala City', 'Kamoke', 'Nowshera Virkan', 'Wazirabad'] },
  Sialkot: { 'Sialkot District': ['Sialkot', 'Daska', 'Pasrur', 'Sambrial'] },
  Narowal: { 'Narowal District': ['Narowal', 'Shakargarh', 'Zafarwal'] },
  Gujrat: { 'Gujrat District': ['Gujrat', 'Kharian', 'Sarai Alamgir'] },
  Hafizabad: { 'Hafizabad District': ['Hafizabad', 'Pindi Bhattian'] },
  MandiBahauddin: { 'Mandi Bahauddin District': ['Mandi Bahauddin', 'Malakwal', 'Phalia'] },
  Rawalpindi: { 'Rawalpindi District': ['Rawalpindi', 'Gujar Khan', 'Kahuta', 'Kallar Syedan', 'Kotli Sattian', 'Murree', 'Taxila'] },
  Attock: { 'Attock District': ['Attock', 'Fateh Jang', 'Hasan Abdal', 'Hazro', 'Jand', 'Pindi Gheb'] },
  Chakwal: { 'Chakwal District': ['Chakwal', 'Choa Saidan Shah', 'Kallar Kahar', 'Talagang'] },
  Jhelum: { 'Jhelum District': ['Jhelum', 'Dina', 'Pind Dadan Khan', 'Sohawa'] },
  Sargodha: { 'Sargodha District': ['Sargodha', 'Bhalwal', 'Bhera', 'Kot Momin', 'Sahiwal', 'Shahpur'] },
  Khushab: { 'Khushab District': ['Khushab', 'Jauharabad', 'Noorpur Thal', 'Quaidabad'] },
  Mianwali: { 'Mianwali District': ['Mianwali', 'Isa Khel', 'Piplan'] },
  Bhakkar: { 'Bhakkar District': ['Bhakkar', 'Darya Khan', 'Kalur Kot', 'Mankera'] },
  Multan: { 'Multan District': ['Multan City', 'Jalalpur Pirwala', 'Shujabad'] },
  Khanewal: { 'Khanewal District': ['Khanewal', 'Jahanian', 'Kabirwala', 'Mian Channu'] },
  Lodhran: { 'Lodhran District': ['Lodhran', 'Dunyapur', 'Kahror Pacca'] },
  Vehari: { 'Vehari District': ['Vehari', 'Burewala', 'Mailsi'] },
  Bahawalpur: { 'Bahawalpur District': ['Bahawalpur', 'Ahmadpur East', 'Hasilpur', 'Khairpur Tamewali', 'Yazman'] },
  Bahawalnagar: { 'Bahawalnagar District': ['Bahawalnagar', 'Chishtian', 'Fort Abbas', 'Haroonabad', 'Minchinabad'] },
  RahimYarKhan: { 'Rahim Yar Khan District': ['Rahim Yar Khan', 'Khanpur', 'Liaquatpur', 'Sadiqabad'] },
  DeraGhaziKhan: { 'Dera Ghazi Khan District': ['Dera Ghazi Khan', 'De-Excluded Area', 'Kot Chutta'] },
  Layyah: { 'Layyah District': ['Layyah', 'Choubara', 'Karor Lal Esan'] },
  Muzaffargarh: { 'Muzaffargarh District': ['Muzaffargarh', 'Alipur', 'Jatoi', 'Kot Addu'] },
  Rajanpur: { 'Rajanpur District': ['Rajanpur', 'Jampur', 'Rojhan'] },
};

const cityOptions = Object.keys(punjabLocations).map((key) => key.replace(/([A-Z])/g, ' $1').trim());
const locationKey = (city: string) => Object.keys(punjabLocations).find((key) => key.replace(/([A-Z])/g, ' $1').trim() === city) || city;

const select = (key: string, code: string, label: string, options: string[], required = false): Field => ({ key, code, label, type: 'select', options, required });
const numeric = (key: string, code: string, label: string, required = false, min?: number, max?: number): Field => ({ key, code, label, type: 'number', required, min, max });

const definitions: Definition[] = [
  { key: 'A', title: 'Establishment Identity', fields: [
    { key: 'coordinates', code: 'HDR.GPS', label: 'Geotag Location (GPS Coordinates)', type: 'gps', required: true },
    { key: 'photo_interview_session', code: 'HDR.P1', label: 'Photo: Interview Session (timestamped)', type: 'photo' },
    { key: 'establishment_name', code: 'A.1', label: 'Name of Establishment', required: true },
    numeric('year_of_establishment', 'A.2', 'Year of Establishment', false, 1800, 2100),
    { key: 'address', code: 'A.3', label: 'Address of Establishment', type: 'textarea', required: true },
    { key: 'phone_cell', code: 'A.5', label: 'Phone / Cell Number', type: 'text' }, { key: 'email', code: 'A.5', label: 'Email', type: 'text' },
    { key: 'unit_type', code: 'A.6', label: 'Type of Unit' }, { key: 'psic_class', code: 'A.7', label: 'PSIC Class' },
    select('area_zone_type', 'A.8', 'Area / Zone Type', ['Industrial Area', 'Residential Area', 'Commercial Area', 'Rural / Agricultural', 'Special Economic Zone / Industrial Estate', 'Other']),
    select('ownership_type', 'A.9', 'Ownership', ['State owned/Public Sector', 'Privately Owned', 'Foreign Controlled Enterprise', 'Other, if any']),
    select('legal_structure', 'A.10', 'Legal Structure', ['Sole Proprietorship', 'Partnership', 'Private Limited Company', 'Public Limited Company', 'Cooperative / Society', 'Limited Liability Company', 'Others']),
  ] },
  { key: 'B', title: 'Operational Details', fields: [
    select('operational_status', 'B.1', 'Current Operational Status', ['Fully Operational', 'Partially Operational', 'Seasonal', 'Temporarily Closed', 'Permanently Closed'], true),
    { key: 'seasonal_period_specify', code: 'B.1', label: 'Seasonal Period' }, { key: 'reason_for_closure', code: 'B.2', label: 'Reason for Closure', type: 'textarea' },
    select('daily_operational_hours', 'B.3', 'Daily Operational Hours', ['Less than 8 hrs.', '8 hrs. (Single Shift)', '16 hrs. (Double Shift)', '24 hrs. (Triple Shift)', 'Flexible / Variable']),
    numeric('working_days_per_week', 'B.3', 'Working Days per Week'), numeric('working_months_per_year', 'B.3', 'Working Months per Year'),
  ] },
  { key: 'C', title: 'Core and Secondary Activities', fields: [{ key: 'has_secondary_products', code: 'C.2', label: 'Has Secondary Products', type: 'boolean' }, { key: 'summary_remarks', code: 'C.3', label: 'Activity Summary', type: 'textarea' }], grid: { key: 'products', label: 'Products', columns: [select('product_category', 'C.1', 'Category', ['Main', 'Secondary'], true), { key: 'product_name', code: 'C.1', label: 'Product Name', required: true }, { key: 'unit_of_measurement', code: 'C.1', label: 'Unit', required: true }, numeric('daily_avg_output', 'C.1', 'Daily Output')] } },
  { key: 'D', title: 'Workforce', fields: [numeric('regular_male', 'D.1', 'Regular Male'), numeric('regular_female', 'D.1', 'Regular Female'), numeric('contract_male', 'D.1', 'Contract Male'), numeric('contract_female', 'D.1', 'Contract Female'), numeric('daily_wages_male', 'D.1', 'Daily Wages Male'), numeric('daily_wages_female', 'D.1', 'Daily Wages Female'), numeric('grand_total_employment', 'D.1', 'Grand Total Employment'), { key: 'is_seasonal_average', code: 'D.1', label: 'Seasonal Average', type: 'boolean' }, { key: 'channel_others_specify', code: 'D.3', label: 'Hiring Notes', type: 'textarea' }] },
  { key: 'E', title: 'Backward Linkages', fields: [select('active_suppliers_count', 'E.1', 'Active Suppliers', ['1–2', '3–5', '6–10', 'More than 10']), { key: 'supplier_dependency', code: 'E.1', label: 'Supplier Dependency', type: 'textarea' }, { key: 'has_supply_disruption_12m', code: 'E.2', label: 'Supply Disruption in Last 12 Months', type: 'boolean' }], grid: { key: 'raw_materials', label: 'Raw Materials', columns: [{ key: 'input_name', code: 'E.3', label: 'Input Name', required: true }, { key: 'unit_of_measurement', code: 'E.3', label: 'Unit', required: true }, { key: 'transformation_stage', code: 'E.3', label: 'Stage' }, numeric('share_in_cost_pct', 'E.3', 'Share of Cost %')] } },
  { key: 'F', title: 'Forward Linkages', fields: [{ key: 'global_supply_chain_role', code: 'F.1', label: 'Global Supply Chain Role' }, { key: 'active_buyers_count', code: 'F.2', label: 'Active Buyers' }, { key: 'has_demand_disruption_12m', code: 'F.3', label: 'Demand Disruption in Last 12 Months', type: 'boolean' }], grid: { key: 'product_sales', label: 'Product Sales', columns: [{ key: 'product_name', code: 'F.4', label: 'Product Name', required: true }, { key: 'unit_of_measurement', code: 'F.4', label: 'Unit', required: true }, { key: 'form_at_transformation', code: 'F.4', label: 'Transformation Stage' }, numeric('share_in_revenue_pct', 'F.4', 'Share of Revenue %')] } },
  { key: 'G', title: 'Technology and Production Processes', fields: [{ key: 'processing_capacity', code: 'G.1', label: 'Processing Capacity', type: 'textarea' }, select('capacity_utilization_rate', 'G.2', 'Capacity Utilization', ['40–59%', '60–74%', '75–84%', '85–95%', 'Above 95%']), select('primary_machinery_source', 'G.3', 'Primary Machinery Source', ['Local', 'Imported', 'Both']), select('machine_integration_level', 'G.4', 'Machine Integration Level', ['No integration', 'Partial integration', 'Full integration']), { key: 'maintenance_approach', code: 'G.5', label: 'Maintenance Approach' }, select('rd_expenditure', 'G.6', 'R&D Expenditure', ['No R&D expenditure', 'Less than 1%', '1–3%', '3–5%', 'More than 5%'])], grid: { key: 'critical_machines', label: 'Critical Machines', columns: [{ key: 'machine_name', code: 'G.7', label: 'Machine Name', required: true }, numeric('quantity', 'G.7', 'Quantity'), { key: 'salient_specification', code: 'G.7', label: 'Specification' }] } },
  { key: 'H', title: 'Energy and Waste Management', fields: [{ key: 'energy_consumption_data', code: 'H.1', label: 'Energy Consumption Details', type: 'textarea' }, { key: 'power_sources_details', code: 'H.2', label: 'Power Sources', type: 'textarea' }, numeric('captive_capacity_kw', 'H.3', 'Captive Capacity (kW)'), numeric('export_capacity_kw', 'H.3', 'Export Capacity (kW)'), { key: 'water_sourcing', code: 'H.4', label: 'Water Sourcing', type: 'textarea' }, { key: 'wastewater_management', code: 'H.5', label: 'Wastewater Management', type: 'textarea' }, { key: 'solid_waste_management', code: 'H.6', label: 'Solid Waste Management', type: 'textarea' }, { key: 'green_practices', code: 'H.7', label: 'Green Practices', type: 'textarea' }] },
  { key: 'I', title: 'Certifications and Compliances', fields: [{ key: 'fire_safety_noc', code: 'I.1', label: 'Fire Safety NOC', type: 'boolean' }, { key: 'boiler_inspection_cert', code: 'I.2', label: 'Boiler Inspection Certificate', type: 'boolean' }, { key: 'environmental_noc_epa', code: 'I.3', label: 'Environmental NOC / EPA', type: 'boolean' }, { key: 'iee_eia_approval', code: 'I.4', label: 'IEE / EIA Approval', type: 'boolean' }, { key: 'certifications_status', code: 'I.5', label: 'Other Certifications', type: 'textarea' }] },
  { key: 'J', title: 'Strategic Business Plan', fields: [{ key: 'operational_planning', code: 'J.1', label: 'Operational Planning', type: 'textarea' }, { key: 'advisory_support', code: 'J.2', label: 'Advisory Support', type: 'textarea' }, select('reinvestment_strategy', 'J.3', 'Reinvestment Strategy', ['None — profits fully withdrawn', 'Less than 25%', '25–50%', '51–75%', 'More than 75%']), { key: 'upscaling_plans', code: 'J.4', label: 'Upscaling Plans', type: 'textarea' }, select('upscaling_timeframe', 'J.5', 'Upscaling Timeframe', ['Within 1 year', '1–2 years', '2–3 years', 'Beyond 3 years'])] },
  { key: 'K', title: 'Future Collaborations and Barriers', fields: [{ key: 'future_collaborations', code: 'K.1', label: 'Future Collaborations', type: 'textarea' }, { key: 'government_support_required', code: 'K.2', label: 'Government Support Required', type: 'textarea' }, { key: 'barrier_ratings', code: 'K.3', label: 'Barrier Ratings', type: 'textarea' }, { key: 'most_critical_barrier', code: 'K.4', label: 'Most Critical Barrier', type: 'textarea' }] },
];

const emptySections = () => Object.fromEntries(definitions.map(({ key }) => [key, {}])) as Record<SurveySectionKey, Record<string, any>>;
const isEmpty = (value: any) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

function PhotoField({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const [preview, setPreview] = useState<string | null>(value?.preview || null);
  const inputId = `photo-${Math.random().toString(36).slice(2)}`;
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.78);
        setPreview(data);
        onChange({ file_name: file.name, preview: data, type: 'image/jpeg' });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  return <div><label className={`photo-upload ${preview ? 'is-done' : ''}`} htmlFor={inputId}>{preview ? <img className="photo-preview" src={preview} alt="Captured preview" /> : <><span className="capture-icon">📷</span><span className="capture-label">Tap to capture or upload photo</span></>}</label><input id={inputId} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />{preview && <button className="btn btn-text btn-sm" type="button" onClick={() => { setPreview(null); onChange(null); }}>Remove photo</button>}</div>;
}

function Input({ field, value, onChange }: { field: Field; value: any; onChange: (value: any) => void }) {
  if (field.type === 'boolean') return <div className="toggle-wrapper"><label className="toggle"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-slider" /></label><span>{value ? 'Yes' : 'No'}</span></div>;
  if (field.type === 'gps') return <div className={`capture-box ${value?.lat ? 'is-done' : ''}`}>{value?.lat ? <><span className="capture-icon">📍</span><div className="capture-label">Location captured</div><div className="gps-coords">{value.lat.toFixed(6)}, {value.lng.toFixed(6)} · ±{Math.round(value.accuracy || 0)}m</div><button className="btn btn-ghost btn-sm" type="button" onClick={() => navigator.geolocation?.getCurrentPosition((position) => onChange({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }))}>Re-capture</button></> : <><span className="capture-icon">📍</span><div className="capture-label">GPS location not captured</div><button className="btn btn-primary btn-sm" type="button" onClick={() => navigator.geolocation?.getCurrentPosition((position) => onChange({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }))}>Capture GPS Location</button></>}</div>;
  if (field.type === 'photo') return <PhotoField value={value} onChange={onChange} />;
  if (field.type === 'textarea') return <textarea className="form-textarea" rows={3} value={value || ''} onChange={(event) => onChange(event.target.value)} />;
  if (field.type === 'select') return <select className="form-select" value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">— Select an option —</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  return <input className="form-input" type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} min={field.min} max={field.max} value={value ?? ''} onChange={(event) => onChange(field.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value)} />;
}

function LocationFields({ data, update, errors }: { data: Record<string, any>; update: (key: string, value: any) => void; errors: string[] }) {
  const districts = data.city ? Object.keys(punjabLocations[locationKey(data.city)] || {}) : [];
  const tehsils = data.district ? Object.values(punjabLocations[locationKey(data.city)]?.[data.district] || {}) : [];
  const locationSelect = (key: string, code: string, label: string, value: string, options: string[], disabled: boolean, onChange: (value: string) => void) => (
    <div className={`question-card${errors.includes(label) ? ' error' : ''}`}>
      <div className="question-meta"><span className="question-code">{code}</span><span className="question-mandatory">★ Required</span></div>
      <div className="question-text">{label}</div>
      <select className="form-select" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{disabled ? `Select ${label === 'District' ? 'a city' : 'a district'} first` : `— Select ${label.toLowerCase()} —`}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {errors.includes(label) && <div className="form-error">⚠ This field is required.</div>}
    </div>
  );
  return <>
    {locationSelect('city', 'A.4', 'City', data.city, cityOptions, false, (value) => { update('city', value); update('district', ''); update('tehsil', ''); })}
    {locationSelect('district', 'A.4', 'District', data.district, districts, !data.city, (value) => { update('district', value); update('tehsil', ''); })}
    {locationSelect('tehsil', 'A.4', 'Tehsil', data.tehsil, tehsils, !data.district, (value) => update('tehsil', value))}
  </>;
}

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate(); const { user } = useAuth();
  const [current, setCurrent] = useState(0); const [sections, setSections] = useState(emptySections); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [errors, setErrors] = useState<string[]>([]); const [surveyId] = useState(id || uuidv4()); const topRef = useRef<HTMLDivElement>(null);
  const definition = definitions[current]; const data = sections[definition.key]; const progress = Math.round((current / (definitions.length - 1)) * 100);
  useEffect(() => { if (id) getSubmission(id).then((submission) => submission && setSections({ ...emptySections(), ...submission.sections })); }, [id]);
  const update = (key: string, value: any) => { setSections((previous) => ({ ...previous, [definition.key]: { ...previous[definition.key], [key]: value } })); setErrors([]); };
  const updateRow = (gridKey: string, index: number, key: string, value: any) => { const rows = [...(data[gridKey] || [])]; rows[index] = { ...rows[index], [key]: value }; update(gridKey, rows); };
  const validate = () => {
    const missing = definition.fields.filter((field) => field.required && isEmpty(data[field.key])).map((field) => field.label);
    if (definition.key === 'A') {
      if (isEmpty(data.city)) missing.push('City');
      if (isEmpty(data.district)) missing.push('District');
      if (isEmpty(data.tehsil)) missing.push('Tehsil');
    }
    if (definition.grid) {
      const rows = data[definition.grid.key] || [];
      rows.forEach((row: Record<string, any>, index: number) => {
        definition.grid?.columns.filter((field) => field.required && isEmpty(row[field.key])).forEach((field) => missing.push(`${definition.grid?.label} row ${index + 1}: ${field.label}`));
      });
    }
    setErrors(missing);
    return missing.length === 0;
  };
  const persist = async (status: SurveySubmissionDraft['sync_status']) => { const gps = sections.A.coordinates || {}; await saveSubmission({ survey_id: surveyId, enumerator_name: user?.full_name || user?.username || 'Unknown', interview_date: new Date().toISOString().slice(0, 10), coordinates_lat: gps.lat, coordinates_lng: gps.lng, gps_accuracy_m: gps.accuracy, device_id: getDeviceId(), sync_status: status, created_at: new Date().toISOString(), sections }); };
  const saveDraft = async () => { setSaving(true); await persist('draft'); setSaving(false); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const goNext = () => { if (!validate()) { topRef.current?.scrollIntoView({ behavior: 'smooth' }); return; } setCurrent((value) => Math.min(value + 1, definitions.length - 1)); topRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const submit = async () => { if (!validate()) return; setSaving(true); await persist('pending_sync'); setSaving(false); navigate('/surveys'); };
  const answered = useMemo(() => definitions.reduce((count, item) => count + item.fields.filter((field) => !isEmpty(sections[item.key][field.key])).length, 0), [sections]);

  return <div ref={topRef} style={{ paddingBottom: 24 }}>
    <div style={{ background: 'var(--surface)', padding: '10px 14px 0', margin: '-12px -12px 8px', borderBottom: '1px solid var(--border)' }}><div className="flex items-center gap-8" style={{ marginBottom: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => navigate('/surveys')}>← Back</button><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Punjab Industrial Unit Survey</div><div className="text-small text-muted">v3.0</div></div><button className="btn btn-ghost btn-sm" onClick={saveDraft} disabled={saving}>{saved ? '✓ Saved' : '▣ Draft'}</button></div><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span className="overline">Overall progress</span><span className="text-small text-muted">{answered} fields · {progress}%</span></div><div className="progress-bar" style={{ marginBottom: 10 }}><div className="progress-fill" style={{ width: `${progress}%` }} /></div><div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>{definitions.map((item, index) => <button key={item.key} title={item.title} onClick={() => setCurrent(index)} style={{ flex: '0 0 56px', height: 52, borderRadius: 10, border: `2px solid ${index === current ? 'var(--primary)' : 'var(--border)'}`, background: index === current ? 'var(--primary)' : 'var(--surface)', color: index === current ? '#fff' : 'var(--text-muted)', fontWeight: 800, cursor: 'pointer' }}><div style={{ fontSize: 18 }}>{item.key}</div><div style={{ fontSize: 9 }}>{index === current ? 'current' : index < current ? '✓ done' : 'pending'}</div></button>)}</div><div style={{ padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}><span className="chip chip-primary">{current + 1}/{definitions.length}</span><strong style={{ fontSize: 12, color: 'var(--primary)' }}>Section {definition.key}: {definition.title}</strong></div></div>
    {errors.length > 0 && <div className="alert alert-error"><span>⚠️</span><div><strong>Please complete the required fields before continuing.</strong><div style={{ marginTop: 4 }}>{errors.join(' · ')}</div></div></div>}
    <div className="text-small text-muted" style={{ margin: '0 14px 10px' }}>{definition.fields.length + (definition.grid ? 1 : 0)} questions in this section</div>
    {definition.key === 'A' && <LocationFields data={data} update={update} errors={errors} />}
    {definition.fields.map((field) => <div key={field.key} className={`question-card${errors.includes(field.label) ? ' error' : ''}`}><div className="question-meta"><span className="question-code">{field.code}</span>{field.required && <span className="question-mandatory">★ Required</span>}</div><div className="question-text">{field.label}</div>{field.type === 'number' && <div className="form-hint">Enter numeric value{field.min !== undefined ? ` (${field.min}–${field.max})` : ''}</div>}<Input field={field} value={data[field.key]} onChange={(value) => update(field.key, value)} />{errors.includes(field.label) && <div className="form-error">⚠ This field is required.</div>}</div>)}
    {definition.grid && <div className="question-card"><div className="question-meta"><span className="question-code">{definition.key}.TABLE</span></div><div className="question-text">{definition.grid.label}</div>{(data[definition.grid.key] || []).map((row: Record<string, any>, index: number) => <div key={index} style={{ borderTop: '1px solid var(--divider)', paddingTop: 12, marginTop: 12 }}><div className="overline" style={{ marginBottom: 8 }}>Row {index + 1}</div>{definition.grid!.columns.map((field) => <div className="form-field" key={field.key}><label className="form-label">{field.label}</label><Input field={field} value={row[field.key]} onChange={(value) => updateRow(definition.grid!.key, index, field.key, value)} /></div>)}<button className="btn btn-text btn-sm" type="button" onClick={() => update(definition.grid!.key, (data[definition.grid!.key] || []).filter((_: unknown, rowIndex: number) => rowIndex !== index))}>Remove row</button></div>)}<button className="btn btn-outline btn-sm" type="button" onClick={() => update(definition.grid!.key, [...(data[definition.grid!.key] || []), {}])}>＋ Add row</button></div>}
    <div style={{ position: 'sticky', bottom: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center', margin: '12px -12px -24px' }}><button className="btn btn-ghost" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>← Prev</button><div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>{current + 1} / {definitions.length}</div>{current === definitions.length - 1 ? <button className="btn btn-success" onClick={submit} disabled={saving}>{saving ? 'Saving…' : '✓ Submit Survey'}</button> : <button className="btn btn-primary" onClick={goNext}>Next →</button>}</div>
  </div>;
}

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const SEVERITY_COLORS: Record<string, string> = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };

const MapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [mapStyle, setMapStyle] = useState('dark-v11');
  const [tokenMissing, setTokenMissing] = useState(false);
  const circleIds = useRef<string[]>([]);
  const circleCounter = useRef(0);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!MAPBOX_TOKEN) {
      setTokenMissing(true);
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${mapStyle}`,
      center: [72.5714, 23.0225],
      zoom: 12,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.current.on('load', () => { fetchReports(); });
    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line

  const fetchReports = async () => {
    try {
      const res = await ApiService.getReports({ limit: 100 });
      const reps = res.data.reports || [];
      setReports(reps);
      renderCircles(reps);
    } catch (err) { console.error(err); }
  };

  const clearCircles = () => {
    if (!map.current) return;
    circleIds.current.forEach(id => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
      if (map.current!.getSource(id)) map.current!.removeSource(id);
    });
    circleIds.current = [];
  };

  const addCircle = (lat: number, lng: number, radius: number, color: string, popup: string) => {
    if (!map.current) return;
    const id = `circle-${circleCounter.current++}`;
    const steps = 64;
    const coords: [number, number][] = [];
    const km = radius / 1000;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const dx = km * Math.cos(angle);
      const dy = km * Math.sin(angle);
      const dlat = dy / 110.574;
      const dlng = dx / (111.320 * Math.cos(lat * Math.PI / 180));
      coords.push([lng + dlng, lat + dlat]);
    }
    coords.push(coords[0]);
    map.current.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} },
    });
    map.current.addLayer({ id, type: 'fill', source: id, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
    const outlineId = `${id}-outline`;
    map.current.addLayer({ id: outlineId, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.7 } });
    circleIds.current.push(id, outlineId);
    map.current.on('click', id, () => {
      new mapboxgl.Popup({ className: 'dark-popup' }).setLngLat([lng, lat]).setHTML(popup).addTo(map.current!);
    });
    map.current.on('mouseenter', id, () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', id, () => { if (map.current) map.current.getCanvas().style.cursor = ''; });
  };

  const renderCircles = (reps: any[]) => {
    clearCircles();
    reps.forEach((r: any) => {
      if (!r.latitude || !r.longitude) return;
      const color = SEVERITY_COLORS[r.severity] || 'var(--text-muted)';
      const status = r.is_active
        ? '<span style="color:#22c55e;font-weight:600">● Active</span>'
        : '<span style="color:#52525b">Expired</span>';
      const popup = `<div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.7;color:var(--text-secondary);background:var(--bg-secondary);backdrop-filter:blur(12px);padding:14px 16px;border-radius:12px;border:1px solid var(--border-primary);min-width:180px">
        <div style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-primary)">${r.severity} Severity</div>
        <div style="color:var(--text-muted)">Type: ${r.report_type}</div>
        <div>Status: ${status}</div>
        <div style="color:var(--text-faint);font-size:12px;margin-top:4px">${new Date(r.created_at).toLocaleString()}</div>
      </div>`;
      addCircle(Number(r.latitude), Number(r.longitude), 500, color, popup);
    });
  };

  const switchStyle = (style: string) => {
    if (!map.current) return;
    setMapStyle(style);
    map.current.setStyle(`mapbox://styles/mapbox/${style}`);
    map.current.once('style.load', () => { renderCircles(reports); });
  };

  const activeCount = reports.filter(r => r.is_active).length;

  if (tokenMissing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-faint)' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>Mapbox token not configured</p>
        <p style={{ fontSize: 13 }}>Set <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>REACT_APP_MAPBOX_TOKEN</code> in your <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>web/.env</code> file</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className="map-header">
        <div>
          <h2 style={themed.title}>Map View</h2>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>{reports.length} reports on map</span>
            {activeCount > 0 && (
              <span style={{ color: '#22c55e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                {activeCount} active
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', borderRadius: 10, padding: 3, border: '1px solid var(--border-primary)' }}>
          {[
            { id: 'dark-v11', label: 'Dark' },
            { id: 'streets-v12', label: 'Streets' },
            { id: 'satellite-streets-v12', label: 'Satellite' },
          ].map(s => (
            <button key={s.id} onClick={() => switchStyle(s.id)}
              style={{
                padding: '7px 16px',
                border: 'none',
                borderRadius: 8,
                background: mapStyle === s.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: mapStyle === s.id ? 600 : 400,
                color: mapStyle === s.id ? '#818cf8' : 'var(--text-muted)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div ref={mapContainer} style={{ height: 'calc(100vh - 210px)', width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-faint)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}40` }} />
            {sev}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapPage;

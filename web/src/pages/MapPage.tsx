import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ApiService from '../services/api';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

const SEVERITY_COLORS: Record<string, string> = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };

const MapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [mapStyle, setMapStyle] = useState('dark-v11');
  const circleIds = useRef<string[]>([]);
  let circleCounter = useRef(0);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
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
    map.current.addLayer({ id, type: 'fill', source: id, paint: { 'fill-color': color, 'fill-opacity': 0.25 } });
    const outlineId = `${id}-outline`;
    map.current.addLayer({ id: outlineId, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.8 } });
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
      const color = SEVERITY_COLORS[r.severity] || '#71717a';
      const status = r.is_active ? '<span style="color:#22c55e;font-weight:600">Active</span>' : '<span style="color:#71717a">Expired</span>';
      const popup = `<div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.6;color:#e4e4e7;background:#18181b;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:14px;font-weight:600;margin-bottom:4px">${r.severity} Severity</div>
        Type: ${r.report_type}<br/>Status: ${status}<br/>
        <span style="color:#71717a">${new Date(r.created_at).toLocaleString()}</span>
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f4f4f5' }}>Map View</h2>
          <span style={{ color: '#71717a', fontSize: 14 }}>{reports.length} reports on map</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'dark-v11', label: 'Dark' },
            { id: 'streets-v12', label: 'Streets' },
            { id: 'satellite-streets-v12', label: 'Satellite' },
          ].map(s => (
            <button key={s.id} onClick={() => switchStyle(s.id)}
              style={{
                padding: '6px 14px',
                border: mapStyle === s.id ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                background: mapStyle === s.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)',
                cursor: 'pointer', fontSize: 13, fontWeight: mapStyle === s.id ? 600 : 400,
                color: mapStyle === s.id ? '#60a5fa' : '#a1a1aa',
                transition: 'all 0.15s',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div ref={mapContainer} style={{ height: 'calc(100vh - 200px)', width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#71717a' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {sev}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapPage;

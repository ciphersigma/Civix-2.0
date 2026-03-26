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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [timelineFrames, setTimelineFrames] = useState<any[]>([]);
  const [timelineIdx, setTimelineIdx] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const playTimer = useRef<any>(null);
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
      const res = await ApiService.getReports({ limit: 100, status: 'active' });
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
    map.current.once('style.load', () => { renderCircles(reports); if (showHeatmap) loadHeatmap(); });
  };

  const loadHeatmap = async () => {
    if (!map.current) return;
    try {
      const res = await ApiService.getHeatmap(90);
      const points = res.data.heatmap || [];
      if (points.length === 0) return;

      const geojson = {
        type: 'FeatureCollection' as const,
        features: points.map((p: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
          properties: { intensity: p.intensity, count: p.count },
        })),
      };

      // Remove existing heatmap layers
      if (map.current.getLayer('heatmap-layer')) map.current.removeLayer('heatmap-layer');
      if (map.current.getSource('heatmap-src')) map.current.removeSource('heatmap-src');

      map.current.addSource('heatmap-src', { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap-src',
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(99,102,241,0.3)',
            0.4, 'rgba(234,179,8,0.5)',
            0.6, 'rgba(249,115,22,0.6)',
            0.8, 'rgba(239,68,68,0.7)',
            1, 'rgba(239,68,68,0.9)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 30],
          'heatmap-opacity': 0.7,
        },
      });
    } catch (e) { console.error('Heatmap load error:', e); }
  };

  const toggleHeatmap = () => {
    if (!map.current) return;
    if (showHeatmap) {
      if (map.current.getLayer('heatmap-layer')) map.current.removeLayer('heatmap-layer');
      if (map.current.getSource('heatmap-src')) map.current.removeSource('heatmap-src');
      setShowHeatmap(false);
    } else {
      setShowHeatmap(true);
      loadHeatmap();
    }
  };

  // Timeline functions
  const loadTimeline = async () => {
    try {
      const res = await ApiService.getHeatmapTimeline(30);
      const frames = res.data.frames || [];
      setTimelineFrames(frames);
      setTimelineIdx(0);
      setShowTimeline(true);
      if (frames.length > 0) renderTimelineFrame(frames[0]);
    } catch (e) { console.error('Timeline load error:', e); }
  };

  const renderTimelineFrame = (frame: any) => {
    if (!map.current || !frame) return;
    const points = frame.points || [];
    const geojson = {
      type: 'FeatureCollection' as const,
      features: points.map((p: any) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        properties: { intensity: p.intensity, count: p.count },
      })),
    };

    if (map.current.getSource('timeline-src')) {
      (map.current.getSource('timeline-src') as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.current.addSource('timeline-src', { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'timeline-layer',
        type: 'heatmap',
        source: 'timeline-src',
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(99,102,241,0.4)',
            0.4, 'rgba(234,179,8,0.5)',
            0.6, 'rgba(249,115,22,0.65)',
            0.8, 'rgba(239,68,68,0.75)',
            1, 'rgba(239,68,68,0.9)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 15, 35],
          'heatmap-opacity': 0.8,
        },
      });
    }
  };

  const playTimeline = () => {
    if (timelineFrames.length === 0) return;
    setTimelinePlaying(true);
    let idx = timelineIdx;
    playTimer.current = setInterval(() => {
      idx = (idx + 1) % timelineFrames.length;
      setTimelineIdx(idx);
      renderTimelineFrame(timelineFrames[idx]);
      if (idx === timelineFrames.length - 1) {
        clearInterval(playTimer.current);
        setTimelinePlaying(false);
      }
    }, 800);
  };

  const pauseTimeline = () => {
    if (playTimer.current) clearInterval(playTimer.current);
    setTimelinePlaying(false);
  };

  const closeTimeline = () => {
    pauseTimeline();
    setShowTimeline(false);
    setTimelineFrames([]);
    if (map.current) {
      if (map.current.getLayer('timeline-layer')) map.current.removeLayer('timeline-layer');
      if (map.current.getSource('timeline-src')) map.current.removeSource('timeline-src');
    }
  };

  const scrubTimeline = (idx: number) => {
    setTimelineIdx(idx);
    if (timelineFrames[idx]) renderTimelineFrame(timelineFrames[idx]);
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
        <button onClick={toggleHeatmap}
          style={{
            padding: '7px 16px',
            border: '1px solid var(--border-primary)',
            borderRadius: 10,
            background: showHeatmap ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: showHeatmap ? '#ef4444' : 'var(--text-muted)',
            transition: 'all 0.2s',
            marginLeft: 8,
          }}>
          🔥 {showHeatmap ? 'Hide Heatmap' : 'Heatmap'}
        </button>
        <button onClick={showTimeline ? closeTimeline : loadTimeline}
          style={{
            padding: '7px 16px',
            border: '1px solid var(--border-primary)',
            borderRadius: 10,
            background: showTimeline ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: showTimeline ? '#6366f1' : 'var(--text-muted)',
            transition: 'all 0.2s',
            marginLeft: 4,
          }}>
          ⏱ {showTimeline ? 'Close Timeline' : 'Timeline'}
        </button>
      </div>
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
      }}>
        <div ref={mapContainer} style={{ height: 'calc(100vh - 210px)', width: '100%' }} />

        {/* Timeline player overlay */}
        {showTimeline && timelineFrames.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16,
            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)',
            borderRadius: 14, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            zIndex: 10,
          }}>
            {/* Play/Pause */}
            <button onClick={timelinePlaying ? pauseTimeline : playTimeline}
              style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: '#6366f1', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {timelinePlaying ? '⏸' : '▶'}
            </button>

            {/* Date label */}
            <div style={{ minWidth: 80, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                {timelineFrames[timelineIdx]?.date ? new Date(timelineFrames[timelineIdx].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                {timelineFrames[timelineIdx]?.reportCount || 0} reports
              </div>
            </div>

            {/* Slider */}
            <input type="range" min={0} max={timelineFrames.length - 1} value={timelineIdx}
              onChange={e => scrubTimeline(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }} />

            {/* Frame counter */}
            <span style={{ fontSize: 12, color: '#64748B', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {timelineIdx + 1}/{timelineFrames.length}
            </span>
          </div>
        )}
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

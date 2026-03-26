import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ApiService from '../services/api';
import './PublicMapPage.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const SEVERITY_COLORS: Record<string, string> = { Low: '#eab308', Medium: '#f59e0b', High: '#ef4444' };

const PublicMapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [mapStyle, setMapStyle] = useState('light-v11');
  const [isDark, setIsDark] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [timelineFrames, setTimelineFrames] = useState<any[]>([]);
  const [timelineIdx, setTimelineIdx] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const playTimer = useRef<any>(null);
  const circleIds = useRef<string[]>([]);
  const circleCounter = useRef(0);

  useEffect(() => {
    if (!mapContainer.current || map.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    // Default to Ahmedabad, then fly to user's location
    const defaultCenter: [number, number] = [72.5714, 23.0225];
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: `mapbox://styles/mapbox/${mapStyle}`,
      center: defaultCenter,
      zoom: 12,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const geolocate = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true });
    map.current.addControl(geolocate, 'top-right');
    map.current.on('load', () => {
      fetchReports();
      // Auto-center on user's location
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12, duration: 1500 });
        },
        () => {} // silently stay on default if denied
      );
    });
    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line

  const fetchReports = async () => {
    try {
      const res = await ApiService.getPublicReports();
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
      new mapboxgl.Popup({ className: 'public-map-popup' }).setLngLat([lng, lat]).setHTML(popup).addTo(map.current!);
    });
    map.current.on('mouseenter', id, () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', id, () => { if (map.current) map.current.getCanvas().style.cursor = ''; });
  };

  const renderCircles = (reps: any[]) => {
    clearCircles();
    reps.forEach((r: any) => {
      if (!r.latitude || !r.longitude) return;
      const color = SEVERITY_COLORS[r.severity] || '#71717a';
      const timeAgo = getTimeAgo(r.created_at);
      const popup = `<div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.7;color:#e4e4e7;padding:4px 0;min-width:160px">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;color:${color}">${r.severity} Severity</div>
        <div style="color:#a1a1aa">Type: ${r.report_type}</div>
        <div style="color:#71717a;font-size:12px;margin-top:2px">${timeAgo}</div>
      </div>`;
      addCircle(Number(r.latitude), Number(r.longitude), 500, color, popup);
    });
  };

  const getTimeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const switchStyle = (style: string) => {
    if (!map.current) return;
    setMapStyle(style);
    map.current.setStyle(`mapbox://styles/mapbox/${style}`);
    map.current.once('style.load', () => { renderCircles(reports); if (showHeatmap) loadHeatmapLayer(); });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    const newStyle = !isDark ? 'dark-v11' : 'light-v11';
    switchStyle(newStyle);
  };

  const loadHeatmapLayer = async () => {
    if (!map.current) return;
    try {
      const res = await ApiService.getHeatmap(90);
      const pts = res.data.heatmap || [];
      if (!pts.length) return;
      if (map.current.getLayer('heatmap-layer')) map.current.removeLayer('heatmap-layer');
      if (map.current.getSource('heatmap-src')) map.current.removeSource('heatmap-src');
      map.current.addSource('heatmap-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: pts.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] }, properties: { intensity: p.intensity } })) },
      });
      map.current.addLayer({
        id: 'heatmap-layer', type: 'heatmap', source: 'heatmap-src',
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(99,102,241,0.3)', 0.4, 'rgba(234,179,8,0.5)', 0.6, 'rgba(249,115,22,0.6)', 0.8, 'rgba(239,68,68,0.7)', 1, 'rgba(239,68,68,0.9)'],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 30],
          'heatmap-opacity': 0.7,
        },
      });
    } catch (e) { console.error('Heatmap error:', e); }
  };

  const toggleHeatmap = () => {
    if (!map.current) return;
    if (showHeatmap) {
      if (map.current.getLayer('heatmap-layer')) map.current.removeLayer('heatmap-layer');
      if (map.current.getSource('heatmap-src')) map.current.removeSource('heatmap-src');
      setShowHeatmap(false);
    } else {
      setShowHeatmap(true);
      loadHeatmapLayer();
    }
  };

  // Timeline functions
  const loadTimeline = async () => {
    if (!map.current) return;
    try {
      const res = await ApiService.getHeatmapTimeline(30);
      const frames = res.data.frames || [];
      setTimelineFrames(frames);
      setTimelineIdx(0);
      setShowTimeline(true);
      if (frames.length > 0) renderTimelineFrame(frames[0]);
    } catch (e) { console.error('Timeline error:', e); }
  };

  const renderTimelineFrame = (frame: any) => {
    if (!map.current || !frame) return;
    const points = frame.points || [];
    const geojson: any = {
      type: 'FeatureCollection',
      features: points.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] }, properties: { intensity: p.intensity } })),
    };
    if (map.current.getSource('timeline-src')) {
      (map.current.getSource('timeline-src') as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.current.addSource('timeline-src', { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'timeline-layer', type: 'heatmap', source: 'timeline-src',
        paint: {
          'heatmap-weight': ['get', 'intensity'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, 'rgba(99,102,241,0.3)', 0.4, 'rgba(234,179,8,0.5)', 0.6, 'rgba(249,115,22,0.6)', 0.8, 'rgba(239,68,68,0.7)', 1, 'rgba(239,68,68,0.9)'],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 30],
          'heatmap-opacity': 0.75,
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
      if (idx === timelineFrames.length - 1) { clearInterval(playTimer.current); setTimelinePlaying(false); }
    }, 800);
  };

  const pauseTimeline = () => { if (playTimer.current) clearInterval(playTimer.current); setTimelinePlaying(false); };

  const closeTimeline = () => {
    pauseTimeline(); setShowTimeline(false); setTimelineFrames([]);
    if (map.current) {
      if (map.current.getLayer('timeline-layer')) map.current.removeLayer('timeline-layer');
      if (map.current.getSource('timeline-src')) map.current.removeSource('timeline-src');
    }
  };

  const scrubTimeline = (idx: number) => { setTimelineIdx(idx); if (timelineFrames[idx]) renderTimelineFrame(timelineFrames[idx]); };

  const severityCounts = {
    High: reports.filter(r => r.severity === 'High').length,
    Medium: reports.filter(r => r.severity === 'Medium').length,
    Low: reports.filter(r => r.severity === 'Low').length,
  };

  return (
    <div className={`public-map ${isDark ? 'dark' : 'light'}`}>
      {/* Top bar */}
      <header className="pm-header">
        <div className="pm-header-left">
          <Link to="/" className="pm-logo">
            <img src="/logo.png" alt="CIVIX" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span>CIVIX</span>
          </Link>
          <span className="pm-divider" />
          <span className="pm-title">Live Waterlogging Map</span>
        </div>
        <div className="pm-header-right">
          <div className="pm-stats-bar">
            {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
              <div key={sev} className="pm-stat-chip">
                <span className="pm-stat-dot" style={{ background: color }} />
                <span className="pm-stat-count">{severityCounts[sev as keyof typeof severityCounts]}</span>
                <span className="pm-stat-label">{sev}</span>
              </div>
            ))}
          </div>
          <div className="pm-style-switcher">
            {[
              { id: 'light-v11', label: 'Light' },
              { id: 'dark-v11', label: 'Dark' },
              { id: 'streets-v12', label: 'Streets' },
              { id: 'satellite-streets-v12', label: 'Satellite' },
            ].map(s => (
              <button key={s.id} onClick={() => switchStyle(s.id)}
                className={`pm-style-btn ${mapStyle === s.id ? 'active' : ''}`}>
                {s.label}
              </button>
            ))}
          </div>
          <button className="pm-theme-btn" onClick={toggleTheme}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          <button className={`pm-theme-btn ${showHeatmap ? 'active' : ''}`} onClick={toggleHeatmap} title="Toggle flood heatmap">
            🔥
          </button>
          <button className={`pm-theme-btn ${showTimeline ? 'active' : ''}`} onClick={showTimeline ? closeTimeline : loadTimeline} title="Flood timeline">
            ⏱
          </button>
        </div>
      </header>

      {/* Map */}
      <div className="pm-map-wrap" style={{ position: 'relative' }}>
        {MAPBOX_TOKEN ? (
          <div ref={mapContainer} className="pm-map" />
        ) : (
          <div className="pm-no-token">
            <p>Map unavailable — Mapbox token not configured</p>
          </div>
        )}

        {/* Timeline player overlay */}
        {showTimeline && timelineFrames.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, right: 16,
            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)',
            borderRadius: 14, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 14, zIndex: 10,
          }}>
            <button onClick={timelinePlaying ? pauseTimeline : playTimeline}
              style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: '#6366f1', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {timelinePlaying ? '⏸' : '▶'}
            </button>
            <div style={{ minWidth: 80, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                {timelineFrames[timelineIdx]?.date ? new Date(timelineFrames[timelineIdx].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{timelineFrames[timelineIdx]?.reportCount || 0} reports</div>
            </div>
            <input type="range" min={0} max={timelineFrames.length - 1} value={timelineIdx}
              onChange={e => scrubTimeline(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: '#6366f1', cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: '#64748B', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {timelineIdx + 1}/{timelineFrames.length}
            </span>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="pm-footer">
        <div className="pm-footer-left">
          <span className="pm-live-dot" />
          <span>{reports.length} active reports</span>
        </div>
        <div className="pm-footer-right">
          <span>Click on a zone to see details</span>
          <span className="pm-divider" />
          <Link to="/" className="pm-back-link">← Back to CIVIX</Link>
        </div>
      </div>
    </div>
  );
};

export default PublicMapPage;

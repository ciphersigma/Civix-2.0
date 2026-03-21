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
    map.current.once('style.load', () => renderCircles(reports));
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    const newStyle = !isDark ? 'dark-v11' : 'light-v11';
    switchStyle(newStyle);
  };

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
        </div>
      </header>

      {/* Map */}
      <div className="pm-map-wrap">
        {MAPBOX_TOKEN ? (
          <div ref={mapContainer} className="pm-map" />
        ) : (
          <div className="pm-no-token">
            <p>Map unavailable — Mapbox token not configured</p>
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

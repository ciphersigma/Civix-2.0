import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, TextInput, Keyboard,
  ActivityIndicator, FlatList, StatusBar, Platform, Alert,
  PermissionsAndroid, ScrollView, Dimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { Theme } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiYWxwaGFpbn' + 'N0aW54IiwiYSI6ImNta3A2N3M' + '2dDBldjEzZXFyeTJzeGRhdzMifQ.C7b81YKX5_cWuVFJNOMkoA';

interface GeoResult { id: string; place_name: string; center: [number, number]; }

const fmtDist = (m: number) => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
const fmtTime = (s: number) => { const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; };
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const NavigationScreen = ({ navigation, route: navRoute }: any) => {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(navRoute?.params?.destination || null);
  const [searchQuery, setSearchQuery] = useState(navRoute?.params?.destination?.name || '');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<'shortest' | 'safe'>('safe');
  const [navigating, setNavigating] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [distToNextStep, setDistToNextStep] = useState(0);
  const [eta, setEta] = useState(0);
  const [remainingDist, setRemainingDist] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const searchTimer = useRef<any>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const watchId = useRef<number | null>(null);
  const top = Math.max(insets.top, Platform.OS === 'android' ? 40 : 0);

  // ── All logic preserved exactly ──
  useEffect(() => { getLoc(); }, []);
  useEffect(() => { if (origin && destination) fetchNav(); }, [origin, destination]);
  useEffect(() => { return () => { if (watchId.current !== null) Geolocation.clearWatch(watchId.current); }; }, []);

  const getLoc = async () => {
    if (Platform.OS === 'android') { const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION); if (g !== PermissionsAndroid.RESULTS.GRANTED) return; }
    Geolocation.getCurrentPosition(p => setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setOrigin({ lat: 23.0225, lng: 72.5714 }), { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
  };
  const fetchNav = async () => {
    if (!origin || !destination) return; setLoading(true);
    try { const r = await api.get('/reports/navigate', { params: { origin: origin.lat+','+origin.lng, destination: destination.lat+','+destination.lng, profile: 'driving' } }); setRouteData(r.data); setActiveRoute(r.data.safe ? 'safe' : 'shortest'); fitB(r.data); }
    catch { Alert.alert('Error', 'Could not compute route'); } finally { setLoading(false); }
  };
  const fitB = (d: any) => {
    if (!cameraRef.current || !origin || !destination) return;
    const pts = [[origin.lng, origin.lat], [destination.lng, destination.lat]];
    (d.allHazards || []).forEach((h: any) => pts.push([h.longitude, h.latitude]));
    cameraRef.current.fitBounds([Math.max(...pts.map(p=>p[0]))+0.01, Math.max(...pts.map(p=>p[1]))+0.01], [Math.min(...pts.map(p=>p[0]))-0.01, Math.min(...pts.map(p=>p[1]))-0.01], 80, 600);
  };
  const startNav = () => {
    if (!routeData) return; setNavigating(true); setCurrentStepIdx(0); setIsFollowing(true);
    watchId.current = Geolocation.watchPosition(p => { const l = { lat: p.coords.latitude, lng: p.coords.longitude, heading: p.coords.heading || 0 }; updateProg(l); }, () => {}, { enableHighAccuracy: true, distanceFilter: 5, interval: 2000, fastestInterval: 1000 });
  };
  const updateProg = (loc: { lat: number; lng: number }) => {
    const rt = routeData ? (activeRoute === 'safe' && routeData.safe ? routeData.safe : routeData.shortest) : null;
    if (!rt) return; const steps = rt.steps || []; if (!steps.length) return;
    let ci = currentStepIdx, md = Infinity;
    for (let i = Math.max(0, ci - 1); i < Math.min(steps.length, ci + 3); i++) { if (steps[i].startCoord) { const d = haversine(loc.lat, loc.lng, steps[i].startCoord[1], steps[i].startCoord[0]); if (d < md) { md = d; ci = i; } } }
    if (ci > currentStepIdx) setCurrentStepIdx(ci);
    const ni = Math.min(ci + 1, steps.length - 1);
    if (steps[ni]?.startCoord) setDistToNextStep(haversine(loc.lat, loc.lng, steps[ni].startCoord[1], steps[ni].startCoord[0]));
    let rd = 0, rt2 = 0; for (let i = ci; i < steps.length; i++) { rd += steps[i].distance || 0; rt2 += steps[i].duration || 0; }
    setRemainingDist(rd); setEta(rt2);
    if (destination && haversine(loc.lat, loc.lng, destination.lat, destination.lng) < 30) { stopNav(); Alert.alert('Arrived!', 'You reached your destination.'); }
  };
  const stopNav = () => { setNavigating(false); setIsFollowing(true); if (watchId.current !== null) { Geolocation.clearWatch(watchId.current); watchId.current = null; } if (routeData) fitB(routeData); };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || searchQuery.length < 3) { setSearchResults([]); setShowResults(false); return; }
    searchTimer.current = setTimeout(() => geocode(searchQuery.trim()), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);
  const geocode = async (q: string) => {
    setSearching(true);
    try { const d = await (await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${origin?.lng||72.5714},${origin?.lat||23.0225}`)).json(); if (d.features) { setSearchResults(d.features.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center }))); setShowResults(true); } }
    catch {} finally { setSearching(false); }
  };
  const pick = (r: GeoResult) => { Keyboard.dismiss(); setSearchQuery(r.place_name.split(',')[0]); setShowResults(false); setDestination({ lat: r.center[1], lng: r.center[0], name: r.place_name.split(',')[0] }); };

  const cur = routeData ? (activeRoute === 'safe' && routeData.safe ? routeData.safe : routeData.shortest) : null;
  const steps = cur?.steps || [];
  const haz = cur?.hazards?.count || 0;
  const curStep = steps[currentStepIdx] || null;
  const geoJSON = cur ? { type: 'Feature' as const, geometry: cur.geometry, properties: {} } : null;
  const alt = routeData ? (activeRoute === 'safe' ? routeData.shortest : routeData.safe) : null;
  const altJSON = alt ? { type: 'Feature' as const, geometry: alt.geometry, properties: {} } : null;

  // ── UI ──
  return (
    <View style={[s.root, { backgroundColor: Theme.darkBg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Map — dark style for nav */}
      <MapboxGL.MapView style={StyleSheet.absoluteFillObject} styleURL="mapbox://styles/mapbox/dark-v11" scaleBarEnabled={false} compassEnabled={false}
        onTouchStart={() => { if (navigating) setIsFollowing(false); }} onPress={() => { setShowResults(false); Keyboard.dismiss(); }}>
        {origin && !navigating && <MapboxGL.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [origin.lng, origin.lat], zoomLevel: 13 }} />}
        {navigating && isFollowing && <MapboxGL.Camera ref={cameraRef} followUserLocation followUserMode={MapboxGL.UserTrackingMode.FollowWithHeading} followZoomLevel={17} followPitch={55} animationMode="easeTo" animationDuration={500} />}
        {navigating && !isFollowing && <MapboxGL.Camera ref={cameraRef} />}
        {navigating && <MapboxGL.LocationPuck puckBearing="heading" puckBearingEnabled pulsing={{ isEnabled: true, color: Theme.primary, radius: 50 }} visible />}
        {altJSON && !navigating && <MapboxGL.ShapeSource id="alt" shape={altJSON}><MapboxGL.LineLayer id="alt-l" style={{ lineColor: '#475569', lineWidth: 4, lineOpacity: 0.5, lineCap: 'round', lineJoin: 'round' }} /></MapboxGL.ShapeSource>}
        {geoJSON && <MapboxGL.ShapeSource id="route" shape={geoJSON}><MapboxGL.LineLayer id="route-l" style={{ lineColor: activeRoute === 'safe' ? Theme.green : Theme.primary, lineWidth: navigating ? 6 : 5, lineOpacity: 0.9, lineCap: 'round', lineJoin: 'round' }} /></MapboxGL.ShapeSource>}
        {!navigating && origin && <MapboxGL.PointAnnotation id="o" coordinate={[origin.lng, origin.lat]}><View style={s.oDot}><View style={s.oDotIn} /></View></MapboxGL.PointAnnotation>}
        {destination && <MapboxGL.PointAnnotation id="d" coordinate={[destination.lng, destination.lat]}><View style={s.dDot}><Icon name="map-marker" size={18} color={Theme.primary} /></View></MapboxGL.PointAnnotation>}
        {(routeData?.allHazards || []).map((h: any) => <MapboxGL.PointAnnotation key={h.id} id={'h-'+h.id} coordinate={[h.longitude, h.latitude]}><View style={s.hazDot}><Icon name="alert" size={12} color={Theme.yellow} /></View></MapboxGL.PointAnnotation>)}
      </MapboxGL.MapView>

      {/* ── Top: back + search (preview mode) ── */}
      {!navigating && (
        <View style={[s.topBar, { top: top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Icon name="arrow-left" size={20} color="#fff" /></TouchableOpacity>
          <View style={s.searchBox}>
            <Icon name="magnify" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput style={s.searchIn} placeholder="Where to?" placeholderTextColor="#64748B" value={searchQuery}
              onChangeText={t => { setSearchQuery(t); if (!t.trim()) setShowResults(false); }}
              onFocus={() => { if (searchResults.length) setShowResults(true); }} returnKeyType="search" />
            {searching && <ActivityIndicator size="small" color={Theme.primary} />}
            {searchQuery.length > 0 && !searching && <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); setRouteData(null); setDestination(null); }}><Icon name="close" size={18} color="#64748B" /></TouchableOpacity>}
          </View>
        </View>
      )}
      {!navigating && showResults && searchResults.length > 0 && (
        <View style={[s.dropdown, { top: top + 66 }]}>
          <FlatList data={searchResults} keyExtractor={i => i.id} keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={s.dropItem} onPress={() => pick(item)} activeOpacity={0.6}>
                <Icon name="map-marker-outline" size={16} color="#64748B" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}><Text style={s.dropName} numberOfLines={1}>{item.place_name.split(',')[0]}</Text><Text style={s.dropAddr} numberOfLines={1}>{item.place_name.split(',').slice(1).join(',').trim()}</Text></View>
              </TouchableOpacity>
            )} />
        </View>
      )}

      {/* ── Route toggle (preview mode) ── */}
      {routeData?.safe && routeData?.shortest && !navigating && !loading && (
        <View style={[s.toggleRow, { top: top + 66 }]}>
          <TouchableOpacity style={[s.toggleBtn, activeRoute === 'safe' && s.toggleOn]} onPress={() => setActiveRoute('safe')}>
            <Icon name="shield-check" size={14} color={activeRoute === 'safe' ? '#fff' : '#94A3B8'} />
            <Text style={[s.toggleTxt, activeRoute === 'safe' && { color: '#fff' }]}>Safe Route</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, activeRoute === 'shortest' && s.toggleOn]} onPress={() => setActiveRoute('shortest')}>
            <Icon name="lightning-bolt" size={14} color={activeRoute === 'shortest' ? '#fff' : '#94A3B8'} />
            <Text style={[s.toggleTxt, activeRoute === 'shortest' && { color: '#fff' }]}>Fastest Route</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Navigation mode: top instruction ── */}
      {navigating && curStep && (
        <View style={[s.instrCard, { paddingTop: top + 12 }]}>
          <Text style={s.instrDist}>{fmtDist(distToNextStep > 0 ? distToNextStep : curStep.distance)}</Text>
          <Text style={s.instrText} numberOfLines={2}>{curStep.instruction || 'Continue on route'}</Text>
        </View>
      )}

      {/* ── Hazard alert banner ── */}
      {haz > 0 && !navigating && cur && (
        <View style={s.alertBanner}>
          <Icon name="alert-circle" size={18} color={Theme.yellow} />
          <Text style={s.alertTxt}>{haz} flood zone{haz > 1 ? 's' : ''} on route — {activeRoute === 'safe' ? 'avoiding' : 'reroute recommended'}</Text>
        </View>
      )}

      {/* ── Recenter (nav mode) ── */}
      {navigating && !isFollowing && (
        <TouchableOpacity style={s.recenter} onPress={() => setIsFollowing(true)} activeOpacity={0.8}>
          <Icon name="crosshairs-gps" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Loading ── */}
      {loading && <View style={s.loadWrap}><ActivityIndicator size="large" color={Theme.primary} /><Text style={s.loadTxt}>Finding safest route...</Text></View>}

      {/* ── Bottom panel: preview mode ── */}
      {cur && !loading && !navigating && (
        <View style={[s.panel, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={s.panelTitle}>Available Routes</Text>

          {/* Recommended route card */}
          <View style={s.routeCard}>
            <View style={s.routeCardTop}>
              <View style={s.routeIcon}><Icon name="navigation-variant" size={22} color={Theme.green} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.routeLabel}>{haz === 0 ? 'No flooding reported' : `${haz} hazard${haz > 1 ? 's' : ''} nearby`}</Text>
                  {activeRoute === 'safe' && <View style={s.recBadge}><Text style={s.recTxt}>Recommended</Text></View>}
                </View>
              </View>
              {activeRoute === 'safe' && <Icon name="check-circle" size={22} color={Theme.green} />}
            </View>
            <View style={s.routeStats}>
              <View style={s.stat}><Icon name="clock-outline" size={14} color="#94A3B8" /><Text style={s.statBig}>{fmtTime(cur.duration)}</Text></View>
              <View style={s.stat}><Icon name="map-marker-distance" size={14} color="#94A3B8" /><Text style={s.statBig}>{fmtDist(cur.distance)}</Text></View>
              <View style={s.stat}><Icon name="alert-outline" size={14} color="#94A3B8" /><Text style={s.statBig}>{haz} hazards</Text></View>
            </View>
          </View>

          {/* Alt route option */}
          {alt && (
            <TouchableOpacity style={s.altCard} onPress={() => setActiveRoute(activeRoute === 'safe' ? 'shortest' : 'safe')} activeOpacity={0.7}>
              <Icon name="lightning-bolt" size={18} color={Theme.yellow} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.altLabel}>Switch to {activeRoute === 'safe' ? 'Fastest' : 'Safe'} Route</Text>
                <Text style={s.altSub}>{fmtTime(alt.duration)} · {alt.hazards?.count || 0} hazards</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#64748B" />
            </TouchableOpacity>
          )}

          {/* Start button */}
          <TouchableOpacity style={s.startBtn} onPress={startNav} activeOpacity={0.85}>
            <Icon name="navigation-variant" size={18} color="#fff" />
            <Text style={s.startTxt}>Start Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom bar: nav mode ── */}
      {navigating && (
        <View style={[s.navBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.navStats}>
            <View style={s.navStat}><Text style={s.navBig}>{fmtTime(eta)}</Text><Text style={s.navSmall}>ETA</Text></View>
            <View style={s.navSep} />
            <View style={s.navStat}><Text style={s.navBig}>{fmtDist(remainingDist)}</Text><Text style={s.navSmall}>Left</Text></View>
            <View style={s.navSep} />
            <View style={s.navStat}><Text style={[s.navBig, { color: haz > 0 ? Theme.yellow : Theme.green }]}>{haz}</Text><Text style={s.navSmall}>Hazards</Text></View>
          </View>
          <TouchableOpacity style={s.endBtn} onPress={stopNav} activeOpacity={0.85}>
            <Icon name="close" size={16} color={Theme.red} />
            <Text style={s.endTxt}>End Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Empty state ── */}
      {!routeData && !loading && !navigating && (
        <View style={[s.empty, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Icon name="compass-outline" size={40} color="#475569" />
          <Text style={s.emptyTitle}>Navigate safely</Text>
          <Text style={s.emptySub}>Search a destination to find the safest route</Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },

  // Map markers
  oDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.25)', alignItems: 'center', justifyContent: 'center' },
  oDotIn: { width: 12, height: 12, borderRadius: 6, backgroundColor: Theme.primary, borderWidth: 2, borderColor: '#fff' },
  dDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  hazDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 100 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(30,41,59,0.8)', alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.85)', borderRadius: 24, paddingHorizontal: 16, height: 48 },
  searchIn: { flex: 1, fontSize: 15, color: '#F1F5F9', paddingVertical: 0 },

  // Dropdown
  dropdown: { position: 'absolute', left: 68, right: 16, backgroundColor: '#1E293B', borderRadius: 14, elevation: 4, overflow: 'hidden', maxHeight: 200, zIndex: 100 },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155' },
  dropName: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },
  dropAddr: { fontSize: 11, color: '#64748B', marginTop: 1 },

  // Route toggle
  toggleRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', backgroundColor: 'rgba(30,41,59,0.85)', borderRadius: 14, padding: 4, zIndex: 90 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  toggleOn: { backgroundColor: Theme.primary },
  toggleTxt: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },

  // Nav instruction
  instrCard: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Theme.darkBg, paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 100 },
  instrDist: { fontSize: 28, fontWeight: '800', color: Theme.green, letterSpacing: -0.5 },
  instrText: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // Alert banner
  alertBanner: { position: 'absolute', left: 16, right: 16, bottom: 320, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  alertTxt: { fontSize: 13, color: Theme.yellow, fontWeight: '600', flex: 1 },

  // Recenter
  recenter: { position: 'absolute', right: 16, bottom: 180, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(30,41,59,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },

  // Loading
  loadWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  loadTxt: { color: '#94A3B8', fontSize: 14, marginTop: 14 },

  // Bottom panel (preview)
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Theme.darkBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20, elevation: 4 },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9', marginBottom: 16 },

  routeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  routeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  routeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  routeLabel: { fontSize: 14, color: '#475569' },
  recBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  recTxt: { fontSize: 11, fontWeight: '700', color: Theme.green },
  routeStats: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statBig: { fontSize: 13, fontWeight: '600', color: '#475569' },

  altCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginBottom: 16 },
  altLabel: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  altSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: Theme.primary, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  startTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Nav bar (active navigation)
  navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Theme.darkBg, paddingHorizontal: 20, paddingTop: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  navStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  navStat: { flex: 1, alignItems: 'center' },
  navBig: { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
  navSmall: { fontSize: 11, color: '#64748B', marginTop: 2 },
  navSep: { width: 1, height: 28, backgroundColor: '#334155' },
  endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)' },
  endTxt: { color: Theme.red, fontSize: 14, fontWeight: '700' },

  // Empty
  empty: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Theme.darkBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#64748B', marginTop: 6, textAlign: 'center' },
});

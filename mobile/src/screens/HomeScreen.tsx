import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator,
  TextInput, Keyboard, StatusBar, Animated, FlatList, ScrollView,
  PermissionsAndroid, Platform,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';
import { WeatherService } from '../services/WeatherService';
import { api } from '../services/api';
import { Theme as T } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiYWxwaGFpbn' + 'N0aW54IiwiYSI6ImNta3A2N3M' + '2dDBldjEzZXFyeTJzeGRhdzMifQ.C7b81YKX5_cWuVFJNOMkoA';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

const SEV = { High: T.red, Medium: T.yellow, Low: T.green } as Record<string, string>;

interface Geo { id: string; place_name: string; center: [number, number]; }

const reqLoc = async () => {
  if (Platform.OS === 'android') {
    const g = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      { title: 'Location', message: 'Needed to show nearby reports.', buttonPositive: 'Allow', buttonNegative: 'Deny' });
    return g === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

const ago = (d: string) => {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const hasDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { colors: c, isDark } = useTheme();
  const { t } = useLang();
  const [loc, setLoc] = useState({ latitude: 23.0225, longitude: 72.5714 });
  const [hasLoc, setHasLoc] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [sel, setSel] = useState<any>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Geo[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRes, setShowRes] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [wAlert, setWAlert] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const timer = useRef<any>(null);
  const cam = useRef<MapboxGL.Camera>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const top = Math.max(insets.top, Platform.OS === 'android' ? 40 : 0);

  useEffect(() => { init(); }, []);
  useEffect(() => {
    const unsub = WeatherService.setupForegroundHandler((title, body, data) => {
      setWAlert({ title, body, data }); setTimeout(() => setWAlert(null), 8000);
    });
    return () => unsub();
  }, []);
  useEffect(() => { Animated.spring(anim, { toValue: sel ? 1 : 0, useNativeDriver: true, tension: 50, friction: 9 }).start(); }, [sel]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim() || q.length < 3) { setResults([]); setShowRes(false); return; }
    timer.current = setTimeout(() => geocode(q.trim()), 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const init = async () => {
    const off = await AuthService.isOfflineMode(); setIsOffline(off);
    setPendingCount(await ReportService.getPendingCount());
    (await reqLoc()) ? getLoc() : loadReps();
    if (!off) {
      WeatherService.registerForPushNotifications().catch(() => {});
      WeatherService.updateLocation().catch(() => {});
      WeatherService.getCurrentWeather().then(w => { if (w) setWeather(w); }).catch(() => {});
      api.get('/reports/heatmap', { params: { days: 90 } }).then(r => { if (r.data?.heatmap) setHeatmapData(r.data.heatmap); }).catch(() => {});
    }
  };
  const getLoc = () => {
    Geolocation.getCurrentPosition(
      p => { const c = { latitude: p.coords.latitude, longitude: p.coords.longitude }; setLoc(c); setHasLoc(true); cam.current?.setCamera({ centerCoordinate: [c.longitude, c.latitude], zoomLevel: 14, animationDuration: 600 }); loadReps(c.latitude, c.longitude); },
      () => loadReps(), { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  };
  const recenter = useCallback(async () => {
    if (!(await reqLoc())) { Alert.alert('Permission Denied'); return; }
    Geolocation.getCurrentPosition(
      p => { const c = { latitude: p.coords.latitude, longitude: p.coords.longitude }; setLoc(c); setHasLoc(true); cam.current?.setCamera({ centerCoordinate: [c.longitude, c.latitude], zoomLevel: 15, animationDuration: 800 }); },
      () => Alert.alert('Error', 'Could not get location.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
  }, []);
  const loadReps = async (la?: number, ln?: number) => {
    setLoading(true);
    try { setReports(await ReportService.getAreaReports(la || loc.latitude, ln || loc.longitude)); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  const geocode = async (s: string) => {
    setSearching(true);
    try {
      const d = await (await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(s)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${loc.longitude},${loc.latitude}&types=place,locality,neighborhood,address,poi`)).json();
      if (d.features) { setResults(d.features.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center }))); setShowRes(true); }
    } catch {} finally { setSearching(false); }
  };
  const pick = (r: Geo) => { Keyboard.dismiss(); setQ(r.place_name.split(',')[0]); setShowRes(false); setResults([]); cam.current?.setCamera({ centerCoordinate: r.center, zoomLevel: 14, animationDuration: 1000 }); };
  const sync = async () => {
    if (!pendingCount) return;
    try { const r = await ReportService.syncPendingReports(); if (r.synced > 0) { Alert.alert('Synced', `${r.synced} report(s)`); setPendingCount(r.failed); loadReps(); } } catch { Alert.alert('Error', 'Sync failed'); }
  };

  const hi = reports.filter(r => r.severity === 'High').length;
  const md = reports.filter(r => r.severity === 'Medium').length;
  const lo = reports.filter(r => r.severity === 'Low').length;
  const cardY = anim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  return (
    <View style={st.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle={c.statusBar} />

      {/* ── Map ── */}
      <MapboxGL.MapView style={StyleSheet.absoluteFillObject} styleURL={c.mapStyle} scaleBarEnabled={false}
        onPress={() => { setSel(null); setShowRes(false); Keyboard.dismiss(); }}>
        <MapboxGL.Camera ref={cam} centerCoordinate={[loc.longitude, loc.latitude]} zoomLevel={13} />
        {hasLoc && (
          <MapboxGL.PointAnnotation id="me" coordinate={[loc.longitude, loc.latitude]}>
            <View style={st.dot}><View style={st.dotIn} /></View>
          </MapboxGL.PointAnnotation>
        )}
        {/* Heatmap layer — historical flood zones */}
        {showHeatmap && heatmapData && heatmapData.length > 0 && (
          <MapboxGL.ShapeSource id="heatmap-src" shape={{
            type: 'FeatureCollection',
            features: heatmapData.map((h: any, i: number) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [h.longitude, h.latitude] },
              properties: { intensity: h.intensity, count: h.count },
            })),
          }}>
            <MapboxGL.HeatmapLayer id="heatmap-layer" style={{
              heatmapWeight: ['get', 'intensity'],
              heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
              heatmapColor: [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(0,0,0,0)',
                0.2, 'rgba(99,102,241,0.3)',
                0.4, 'rgba(234,179,8,0.5)',
                0.6, 'rgba(249,115,22,0.6)',
                0.8, 'rgba(239,68,68,0.7)',
                1, 'rgba(239,68,68,0.9)',
              ],
              heatmapRadius: ['interpolate', ['linear'], ['zoom'], 10, 15, 15, 25],
              heatmapOpacity: 0.7,
            }} />
          </MapboxGL.ShapeSource>
        )}

        {reports.filter(r => r.latitude != null && r.longitude != null && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude))).map(r => (
          <MapboxGL.PointAnnotation key={r.id} id={`r-${r.id}`} coordinate={[Number(r.longitude), Number(r.latitude)]} onSelected={() => setSel(r)}>
            <View style={[st.pin, { backgroundColor: SEV[r.severity] || T.yellow }]}><Text style={{ fontSize: 12 }}>💧</Text></View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* ── Search bar + profile ── */}
      <View style={[st.searchArea, { top: top + 10 }]}>
        <View style={st.searchRow}>
          <View style={[st.searchBox, { backgroundColor: c.card }]}>
            <Text style={{ fontSize: 14, opacity: 0.35, marginRight: 8 }}>🔍</Text>
            <TextInput style={[st.searchIn, { color: c.text }]} placeholder={t('searchLocation')} placeholderTextColor={c.textMuted}
              value={q} onChangeText={t => { setQ(t); if (!t.trim()) setShowRes(false); }}
              onFocus={() => { if (results.length) setShowRes(true); }} returnKeyType="search" />
            {searching && <ActivityIndicator size="small" color={T.primary} />}
            {q.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setQ(''); setResults([]); setShowRes(false); }}><Text style={{ color: T.textMuted, fontSize: 15, paddingHorizontal: 4 }}>✕</Text></TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[st.profileBtn, { backgroundColor: c.card }]}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>
        {showRes && results.length > 0 && (
          <View style={[st.dropdown, { backgroundColor: c.card }]}>
            <FlatList data={results} keyExtractor={i => i.id} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={st.dropItem} onPress={() => pick(item)} activeOpacity={0.6}>
                  <Text style={{ fontSize: 13, opacity: 0.4, marginRight: 10 }}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dropName} numberOfLines={1}>{item.place_name.split(',')[0]}</Text>
                    <Text style={st.dropAddr} numberOfLines={1}>{item.place_name.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                </TouchableOpacity>
              )} />
          </View>
        )}
      </View>

      {/* ── Weather chip ── */}
      {weather && !wAlert && (
        <TouchableOpacity style={[st.weatherChip, { top: top + 66, backgroundColor: c.card }]} activeOpacity={0.8}
          onPress={() => Alert.alert(weather.isRaining ? '🌧️ Raining' : '☀️ Clear', `${weather.temperature}°C · ${weather.humidity}% humidity · ${weather.precipitation}mm rain`)}>
          <Text style={{ fontSize: 14 }}>{weather.isRaining ? '🌧' : '☀'}</Text>
          <Text style={[st.weatherTxt, { color: c.text }]}>{weather.temperature ? `${Math.round(weather.temperature)}°C` : '--'}</Text>
          <Text style={[st.weatherLabel, { color: c.textMuted }]}>{weather.isRaining ? 'Heavy Rain' : 'Clear'}</Text>
        </TouchableOpacity>
      )}

      {/* ── Weather alert banner ── */}
      {wAlert && (
        <View style={[st.alertBanner, { top: top + 66 }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🌧️</Text>
          <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>{wAlert.title}</Text><Text style={{ fontSize: 12, color: '#1E40AF' }} numberOfLines={1}>{wAlert.body}</Text></View>
          <TouchableOpacity onPress={() => setWAlert(null)}><Text style={{ color: '#1E40AF', fontSize: 14 }}>✕</Text></TouchableOpacity>
        </View>
      )}

      {/* ── Right controls ── */}
      <View style={st.rightCtrls}>
        <TouchableOpacity style={[st.ctrlBtn, { backgroundColor: c.card }]} onPress={recenter} activeOpacity={0.7}><Icon name="crosshairs-gps" size={20} color={c.textSec} /></TouchableOpacity>
        <TouchableOpacity style={[st.ctrlBtn, { backgroundColor: c.card }]} onPress={() => loadReps()} activeOpacity={0.7}><Icon name="refresh" size={20} color={c.textSec} /></TouchableOpacity>
        <TouchableOpacity style={[st.ctrlBtn, showHeatmap ? { backgroundColor: T.primary } : { backgroundColor: c.card }]} onPress={() => setShowHeatmap(!showHeatmap)} activeOpacity={0.7}>
          <Icon name="fire" size={20} color={showHeatmap ? '#fff' : c.textSec} />
        </TouchableOpacity>
      </View>

      {/* ── FAB (center) ── */}
      <View style={st.fabWrap}>
        <TouchableOpacity style={st.fab} onPress={() => navigation.navigate('Report', { location: loc })} activeOpacity={0.85}>
          <Text style={st.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom sheet ── */}
      <View style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: c.card, maxHeight: sheetExpanded ? '70%' : undefined }]}>
        <View style={[st.handle, { backgroundColor: c.border }]} />

        {/* Top row: severity counts */}
        <View style={st.sheetCountsRow}>
          <View style={[st.sheetChip, { backgroundColor: T.red + '15' }]}>
            <View style={[st.sheetDot, { backgroundColor: T.red }]} />
            <Text style={[st.sheetChipVal, { color: c.text }]}>{hi}</Text>
          </View>
          <View style={[st.sheetChip, { backgroundColor: T.yellow + '15' }]}>
            <View style={[st.sheetDot, { backgroundColor: T.yellow }]} />
            <Text style={[st.sheetChipVal, { color: c.text }]}>{md}</Text>
          </View>
          <View style={[st.sheetChip, { backgroundColor: T.green + '15' }]}>
            <View style={[st.sheetDot, { backgroundColor: T.green }]} />
            <Text style={[st.sheetChipVal, { color: c.text }]}>{lo}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => setSheetExpanded(!sheetExpanded)} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={st.sheetViewLink}>{sheetExpanded ? t('hide') : t('view')}</Text>
          </TouchableOpacity>
        </View>

        {/* Middle: report count + pending */}
        <Text style={[st.sheetTitle, { color: c.text }]}>{reports.length} {t('reportsNearby')}</Text>
        {pendingCount > 0 && (
          <TouchableOpacity onPress={sync} style={st.sheetPending}>
            <Icon name="wifi-off" size={14} color={c.textMuted} />
            <Text style={[st.sheetPendingTxt, { color: c.textMuted }]}>{pendingCount} {t('pendingOffline')}</Text>
          </TouchableOpacity>
        )}
        {loading && <ActivityIndicator size="small" color={T.primary} style={{ marginTop: 8 }} />}

        {/* Bottom: Navigate button */}
        <TouchableOpacity style={[st.sheetNavBtn, { backgroundColor: c.cardAlt }]} onPress={() => navigation.navigate('Navigate')} activeOpacity={0.8}>
          <Icon name="navigation-variant-outline" size={18} color={c.text} />
          <Text style={[st.sheetNavTxt, { color: c.text }]}>{t('navigate')}</Text>
        </TouchableOpacity>

        {/* Expanded report list */}
        {sheetExpanded && reports.length > 0 && (
          <ScrollView style={st.reportList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {reports.filter(r => r.latitude != null && r.longitude != null).map((r: any) => {
              const sevColor = SEV[r.severity] || T.yellow;
              const dist = loc ? hasDist(loc.latitude, loc.longitude, Number(r.latitude), Number(r.longitude)) : null;
              return (
                <View key={r.id} style={[st.reportItem, { backgroundColor: c.cardAlt }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={[st.badge, { backgroundColor: sevColor + '18' }]}>
                      <View style={[st.badgeDot, { backgroundColor: sevColor }]} />
                      <Text style={[st.badgeTxt, { color: sevColor }]}>{r.severity}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>{ago(r.created_at)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    {dist !== null && <Text style={{ fontSize: 12, color: c.textSec }}>{dist < 1000 ? Math.round(dist) + 'm away' : (dist / 1000).toFixed(1) + 'km away'}</Text>}
                    {r.report_type && <Text style={{ fontSize: 12, color: c.textMuted, textTransform: 'capitalize' }}>{r.report_type}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity style={[st.voteBtn, { backgroundColor: '#F0FDF4' }]}
                      onPress={async () => { try { await api.post(`/reports/${r.id}/vote`, { vote: 1 }); loadReps(); } catch {} }}>
                      <Text style={{ fontSize: 11 }}>👍</Text><Text style={{ fontSize: 11, fontWeight: '700', color: T.green }}>{r.upvotes || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.voteBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={async () => { try { await api.post(`/reports/${r.id}/vote`, { vote: -1 }); loadReps(); } catch {} }}>
                      <Text style={{ fontSize: 11 }}>👎</Text><Text style={{ fontSize: 11, fontWeight: '700', color: T.red }}>{r.downvotes || 0}</Text>
                    </TouchableOpacity>
                    {(r.upvotes > 0 || r.downvotes > 0) && (
                      <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: c.textMuted }}>{Math.round((r.trust_score || 0.5) * 100)}%</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Selected report card ── */}
      {sel && (
        <Animated.View style={[st.selCard, { transform: [{ translateY: cardY }], backgroundColor: c.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={[st.badge, { backgroundColor: (SEV[sel.severity] || T.yellow) + '18' }]}>
              <View style={[st.badgeDot, { backgroundColor: SEV[sel.severity] || T.yellow }]} />
              <Text style={[st.badgeTxt, { color: SEV[sel.severity] || T.yellow }]}>{sel.severity}</Text>
            </View>
            <Text style={{ fontSize: 12, color: c.textMuted }}>{ago(sel.created_at)}</Text>
            <TouchableOpacity onPress={() => setSel(null)}><Text style={{ fontSize: 16, color: c.textMuted }}>✕</Text></TouchableOpacity>
          </View>
          {sel.report_type && <Text style={{ fontSize: 12, color: c.textMuted, textTransform: 'capitalize', marginBottom: 4 }}>{sel.report_type}</Text>}
          <Text style={{ fontSize: 11, color: c.textMuted, fontFamily: 'monospace' }}>{Number(sel.latitude).toFixed(4)}, {Number(sel.longitude).toFixed(4)}</Text>
          <View style={st.voteRow}>
            <TouchableOpacity style={[st.voteBtn, { backgroundColor: '#F0FDF4' }]}
              onPress={async () => { try { const r = await api.post(`/reports/${sel.id}/vote`, { vote: 1 }); setSel({ ...sel, upvotes: r.data.upvotes, downvotes: r.data.downvotes, trust_score: r.data.trustScore }); } catch { Alert.alert('Error', 'Could not vote'); } }}>
              <Text style={{ fontSize: 12 }}>👍</Text><Text style={{ fontSize: 12, fontWeight: '700', color: T.green }}>{sel.upvotes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.voteBtn, { backgroundColor: '#FEF2F2' }]}
              onPress={async () => { try { const r = await api.post(`/reports/${sel.id}/vote`, { vote: -1 }); setSel({ ...sel, upvotes: r.data.upvotes, downvotes: r.data.downvotes, trust_score: r.data.trustScore }); } catch { Alert.alert('Error', 'Could not vote'); } }}>
              <Text style={{ fontSize: 12 }}>👎</Text><Text style={{ fontSize: 12, fontWeight: '700', color: T.red }}>{sel.downvotes || 0}</Text>
            </TouchableOpacity>
            {(sel.upvotes > 0 || sel.downvotes > 0) && <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: c.textMuted }}>{Math.round((sel.trust_score || 0.5) * 100)}% trust</Text>}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // User dot
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(99,102,241,0.2)', alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.primary, borderWidth: 2.5, borderColor: '#fff', elevation: 3 },
  pin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 4 },

  // Search
  searchArea: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 24, paddingHorizontal: 16, height: 48, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  searchIn: { flex: 1, fontSize: 14, color: T.text, paddingVertical: 0 },
  profileBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  dropdown: { backgroundColor: T.card, borderRadius: 14, marginTop: 8, elevation: 3, overflow: 'hidden', maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.borderLight },
  dropName: { fontSize: 14, fontWeight: '600', color: T.text },
  dropAddr: { fontSize: 11, color: T.textMuted, marginTop: 1 },

  // Weather
  weatherChip: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  weatherTxt: { fontSize: 14, fontWeight: '700', color: T.text },
  weatherLabel: { fontSize: 12, color: T.textMuted },
  alertBanner: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, elevation: 3, zIndex: 200 },

  // Right controls — mid-right, vertically stacked
  rightCtrls: { position: 'absolute', right: 16, bottom: 280, gap: 10 },
  ctrlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },

  // FAB — bottom center, overlaps sheet edge
  fabWrap: { position: 'absolute', bottom: 190, left: 0, right: 0, alignItems: 'center', zIndex: 15, pointerEvents: 'box-none' },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },

  // Bottom sheet
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 10, zIndex: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 16 },

  sheetCountsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sheetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sheetDot: { width: 8, height: 8, borderRadius: 4 },
  sheetChipVal: { fontSize: 14, fontWeight: '700', color: T.text },
  sheetViewLink: { fontSize: 13, fontWeight: '600', color: T.primary, paddingVertical: 4, paddingHorizontal: 8 },

  sheetTitle: { fontSize: 16, fontWeight: '800', color: T.text, marginBottom: 4 },
  sheetPending: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  sheetPendingTxt: { fontSize: 13, color: T.textMuted },

  sheetNavBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: T.borderLight, marginTop: 16 },
  sheetNavTxt: { fontSize: 14, fontWeight: '600', color: T.textPrimary },

  // Expanded report list
  reportList: { marginTop: 16, maxHeight: 300 },
  reportItem: { borderRadius: 12, padding: 12, marginBottom: 8 },

  // Selected card
  selCard: { position: 'absolute', bottom: 210, left: 16, right: 80, backgroundColor: T.card, borderRadius: 14, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeTxt: { fontSize: 12, fontWeight: '700' },
  voteRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.borderLight },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: T.borderLight },
});

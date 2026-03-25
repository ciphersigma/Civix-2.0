import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Alert, Text, TouchableOpacity, ActivityIndicator,
  TextInput, Keyboard, StatusBar, Animated, FlatList,
  PermissionsAndroid, Platform,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';
import { WeatherService } from '../services/WeatherService';
import { api } from '../services/api';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiYWxwaGFpbn' + 'N0aW54IiwiYSI6ImNta3A2N3M' + '2dDBldjEzZXFyeTJzeGRhdzMifQ.C7b81YKX5_cWuVFJNOMkoA';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

const C = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#1E293B',
  textSec: '#64748B',
  textMuted: '#94A3B8',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#10B981',
};

const SEV_COLOR: Record<string, string> = { High: C.red, Medium: C.orange, Low: C.yellow };

interface GeoResult { id: string; place_name: string; center: [number, number]; }

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      { title: 'Location Permission', message: 'This app needs location access to show nearby reports.', buttonPositive: 'Allow', buttonNegative: 'Deny' },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

const timeAgo = (d: string) => {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState({ latitude: 23.0225, longitude: 72.5714 });
  const [hasLocation, setHasLocation] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [weatherAlert, setWeatherAlert] = useState<{ title: string; body: string; data: any } | null>(null);
  const searchTimer = useRef<any>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const statusBarH = Math.max(insets.top, Platform.OS === 'android' ? 40 : 0);

  useEffect(() => { init(); }, []);

  // Listen for foreground push notifications
  useEffect(() => {
    const unsubscribe = WeatherService.setupForegroundHandler((title, body, data) => {
      setWeatherAlert({ title, body, data });
      // Auto-dismiss after 8 seconds
      setTimeout(() => setWeatherAlert(null), 8000);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: selectedReport ? 1 : 0, useNativeDriver: true, tension: 50, friction: 9 }).start();
  }, [selectedReport]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || searchQuery.length < 3) { setSearchResults([]); setShowResults(false); return; }
    searchTimer.current = setTimeout(() => geocodeSearch(searchQuery.trim()), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  const init = async () => {
    const offline = await AuthService.isOfflineMode();
    setIsOffline(offline);
    setPendingCount(await ReportService.getPendingCount());
    const ok = await requestLocationPermission();
    ok ? getCurrentLocation() : loadReports();

    // Register for push notifications and update location for weather alerts
    if (!offline) {
      WeatherService.registerForPushNotifications().catch(() => {});
      WeatherService.updateLocation().catch(() => {});
      WeatherService.getCurrentWeather().then(w => { if (w) setWeather(w); }).catch(() => {});
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords); setHasLocation(true);
        cameraRef.current?.setCamera({ centerCoordinate: [coords.longitude, coords.latitude], zoomLevel: 14, animationDuration: 600 });
        loadReports(coords.latitude, coords.longitude);
      },
      () => loadReports(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const goToMyLocation = useCallback(async () => {
    const ok = await requestLocationPermission();
    if (!ok) { Alert.alert('Permission Denied', 'Enable location in settings.'); return; }
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords); setHasLocation(true);
        cameraRef.current?.setCamera({ centerCoordinate: [coords.longitude, coords.latitude], zoomLevel: 15, animationDuration: 800 });
      },
      () => Alert.alert('Error', 'Could not get location.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, []);

  const loadReports = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      setReports(await ReportService.getAreaReports(lat || location.latitude, lng || location.longitude));
    } catch (e) { console.error('Load reports failed:', e); }
    finally { setLoading(false); }
  };

  const geocodeSearch = async (query: string) => {
    setSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${location.longitude},${location.latitude}&types=place,locality,neighborhood,address,poi`;
      const data = await (await fetch(url)).json();
      if (data.features) {
        setSearchResults(data.features.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center })));
        setShowResults(true);
      }
    } catch {} finally { setSearching(false); }
  };

  const selectPlace = (r: GeoResult) => {
    Keyboard.dismiss(); setSearchQuery(r.place_name.split(',')[0]); setShowResults(false); setSearchResults([]);
    cameraRef.current?.setCamera({ centerCoordinate: r.center, zoomLevel: 14, animationDuration: 1000 });
  };

  const handleSync = async () => {
    if (pendingCount === 0) return;
    try {
      const res = await ReportService.syncPendingReports();
      if (res.synced > 0) { Alert.alert('Synced', `${res.synced} report(s) uploaded`); setPendingCount(res.failed); loadReports(); }
    } catch { Alert.alert('Error', 'Sync failed'); }
  };

  const highCount = reports.filter(r => r.severity === 'High').length;
  const medCount = reports.filter(r => r.severity === 'Medium').length;
  const lowCount = reports.filter(r => r.severity === 'Low').length;
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] });

  return (
    <View style={st.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <MapboxGL.MapView style={StyleSheet.absoluteFillObject} styleURL="mapbox://styles/mapbox/streets-v12" scaleBarEnabled={false}
        onPress={() => { setSelectedReport(null); setShowResults(false); Keyboard.dismiss(); }}>
        <MapboxGL.Camera ref={cameraRef} centerCoordinate={[location.longitude, location.latitude]} zoomLevel={13} />
        {hasLocation && (
          <MapboxGL.PointAnnotation id="user-loc" coordinate={[location.longitude, location.latitude]}>
            <View style={st.blueDotOuter}><View style={st.blueDotInner} /></View>
          </MapboxGL.PointAnnotation>
        )}
        {reports.filter((r: any) => r.latitude != null && r.longitude != null && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude))).map((r: any) => {
          const color = SEV_COLOR[r.severity] || C.yellow;
          return (
            <MapboxGL.PointAnnotation key={r.id} id={`r-${r.id}`} coordinate={[Number(r.longitude), Number(r.latitude)]} onSelected={() => setSelectedReport(r)}>
              <View style={[st.pin, { backgroundColor: color }]}><Text style={st.pinText}>💧</Text></View>
            </MapboxGL.PointAnnotation>
          );
        })}
      </MapboxGL.MapView>

      {/* Search */}
      <View style={[st.searchWrap, { top: statusBarH + 10 }]}>
        <View style={st.searchBox}>
          <Text style={st.searchIcon}>🔍</Text>
          <TextInput style={st.searchInput} placeholder="Search a place..." placeholderTextColor={C.textMuted}
            value={searchQuery} onChangeText={t => { setSearchQuery(t); if (!t.trim()) setShowResults(false); }}
            onFocus={() => { if (searchResults.length) setShowResults(true); }} returnKeyType="search" />
          {searching && <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 4 }} />}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}>
              <Text style={st.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={st.profileBtn}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>
        {showResults && searchResults.length > 0 && (
          <View style={st.dropdown}>
            <FlatList data={searchResults} keyExtractor={i => i.id} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={st.dropItem} onPress={() => selectPlace(item)} activeOpacity={0.6}>
                  <Text style={{ fontSize: 14, marginRight: 10, opacity: 0.5 }}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dropName} numberOfLines={1}>{item.place_name.split(',')[0]}</Text>
                    <Text style={st.dropAddr} numberOfLines={1}>{item.place_name.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                </TouchableOpacity>
              )} />
          </View>
        )}
      </View>

      {isOffline && (
        <View style={[st.offlineBanner, { top: statusBarH + 68 }]}>
          <Text style={st.offlineLabel}>📡 Offline</Text>
          {pendingCount > 0 && (
            <TouchableOpacity onPress={handleSync} style={st.syncBtn}><Text style={st.syncLabel}>Sync {pendingCount}</Text></TouchableOpacity>
          )}
        </View>
      )}

      {/* Weather alert notification banner */}
      {weatherAlert && (
        <View style={[st.weatherAlertBanner, { top: statusBarH + 68 }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🌧️</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.weatherAlertTitle}>{weatherAlert.title}</Text>
            <Text style={st.weatherAlertBody} numberOfLines={2}>{weatherAlert.body}</Text>
          </View>
          <TouchableOpacity onPress={() => setWeatherAlert(null)} style={{ padding: 4 }}>
            <Text style={{ fontSize: 14, color: '#1E40AF' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weather chip */}
      {weather && !weatherAlert && (
        <TouchableOpacity
          style={[st.weatherChip, { top: statusBarH + 68 }, weather.isRaining && st.weatherChipRain]}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              weather.isRaining ? '🌧️ Raining' : '☀️ Clear',
              `Temperature: ${weather.temperature}°C\nHumidity: ${weather.humidity}%\nWind: ${weather.windSpeed} km/h\nPrecipitation: ${weather.precipitation} mm`,
            );
          }}>
          <Text style={{ fontSize: 14 }}>{weather.isRaining ? '🌧️' : '☀️'}</Text>
          <Text style={[st.weatherChipText, weather.isRaining && { color: '#1E40AF' }]}>
            {weather.temperature ? `${Math.round(weather.temperature)}°` : '--'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Side buttons */}
      <View style={st.sideButtons}>
        <TouchableOpacity style={st.circleBtn} onPress={goToMyLocation} activeOpacity={0.7}><Text style={st.circleBtnIcon}>◎</Text></TouchableOpacity>
        <TouchableOpacity style={st.circleBtn} onPress={() => loadReports()} activeOpacity={0.7}><Text style={st.circleBtnIcon}>↻</Text></TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={st.infoBar}>
        <View style={st.infoChip}><View style={[st.infoDot, { backgroundColor: C.red }]} /><Text style={st.infoCount}>{highCount}</Text></View>
        <View style={st.infoChip}><View style={[st.infoDot, { backgroundColor: C.orange }]} /><Text style={st.infoCount}>{medCount}</Text></View>
        <View style={st.infoChip}><View style={[st.infoDot, { backgroundColor: C.yellow }]} /><Text style={st.infoCount}>{lowCount}</Text></View>
        <Text style={st.infoTotal}>{reports.length} reports nearby</Text>
        {loading && <ActivityIndicator size="small" color={C.primary} />}
      </View>

      {/* Selected report card */}
      {selectedReport && (
        <Animated.View style={[st.card, { transform: [{ translateY: cardTranslateY }] }]}>
          <View style={st.cardRow}>
            <View style={[st.cardBadge, { backgroundColor: (SEV_COLOR[selectedReport.severity] || C.yellow) + '18', borderColor: (SEV_COLOR[selectedReport.severity] || C.yellow) + '40' }]}>
              <Text style={[st.cardBadgeText, { color: SEV_COLOR[selectedReport.severity] || C.yellow }]}>{selectedReport.severity}</Text>
            </View>
            <Text style={st.cardDate}>{timeAgo(selectedReport.created_at || selectedReport.createdAt)}</Text>
            <TouchableOpacity onPress={() => setSelectedReport(null)} style={{ padding: 4 }}><Text style={{ fontSize: 16, color: C.textMuted }}>✕</Text></TouchableOpacity>
          </View>
          {selectedReport.report_type && <Text style={st.cardType}>{selectedReport.report_type}</Text>}
          {selectedReport.description ? (
            <Text style={st.cardDesc} numberOfLines={3}>{selectedReport.description}</Text>
          ) : (
            <Text style={[st.cardDesc, { fontStyle: 'italic', color: C.textMuted }]}>No description available</Text>
          )}
          <Text style={st.cardCoords}>{Number(selectedReport.latitude).toFixed(4)}, {Number(selectedReport.longitude).toFixed(4)}</Text>
          {/* Community verification */}
          <View style={st.voteRow}>
            <TouchableOpacity
              style={[st.voteBtn, st.voteBtnUp]}
              onPress={async () => {
                try {
                  const res = await api.post(`/reports/${selectedReport.id}/vote`, { vote: 1 });
                  setSelectedReport({ ...selectedReport, upvotes: res.data.upvotes, downvotes: res.data.downvotes, trust_score: res.data.trustScore });
                } catch { Alert.alert('Error', 'Could not vote'); }
              }}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 13 }}>👍</Text>
              <Text style={st.voteCount}>{selectedReport.upvotes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.voteBtn, st.voteBtnDown]}
              onPress={async () => {
                try {
                  const res = await api.post(`/reports/${selectedReport.id}/vote`, { vote: -1 });
                  setSelectedReport({ ...selectedReport, upvotes: res.data.upvotes, downvotes: res.data.downvotes, trust_score: res.data.trustScore });
                } catch { Alert.alert('Error', 'Could not vote'); }
              }}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 13 }}>👎</Text>
              <Text style={st.voteCountDown}>{selectedReport.downvotes || 0}</Text>
            </TouchableOpacity>
            {(selectedReport.upvotes > 0 || selectedReport.downvotes > 0) && (
              <Text style={st.trustLabel}>
                {Math.round((selectedReport.trust_score || 0.5) * 100)}% trust
              </Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* Bottom action buttons */}
      <View style={st.fabRow}>
        <TouchableOpacity style={st.navBtn} onPress={() => navigation.navigate('Navigate')} activeOpacity={0.85}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
          <Text style={st.navBtnText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.fab} onPress={() => navigation.navigate('Report', { location })} activeOpacity={0.85}>
          <Text style={st.fabPlus}>+</Text>
          <Text style={st.fabText}>Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  blueDotOuter: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.25)', alignItems: 'center', justifyContent: 'center' },
  blueDotInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary, borderWidth: 2.5, borderColor: '#fff', elevation: 3 },
  pin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  pinText: { fontSize: 13 },

  searchWrap: { position: 'absolute', left: 14, right: 14, zIndex: 100 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 28, paddingHorizontal: 14, height: 50, elevation: 4, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  searchIcon: { fontSize: 15, marginRight: 8, opacity: 0.4 },
  searchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 },
  clearBtn: { fontSize: 15, color: C.textMuted, paddingHorizontal: 6, paddingVertical: 4 },
  profileBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },

  dropdown: { backgroundColor: C.card, borderRadius: 16, marginTop: 6, maxHeight: 180, elevation: 5, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight },
  dropName: { fontSize: 14, fontWeight: '600', color: C.text },
  dropAddr: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  offlineBanner: { position: 'absolute', left: 16, right: 16, backgroundColor: '#FEF9C3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', elevation: 3, borderWidth: 1, borderColor: '#FDE68A' },
  offlineLabel: { flex: 1, color: '#92400E', fontWeight: '600', fontSize: 13 },
  syncBtn: { backgroundColor: C.yellow, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  syncLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },

  sideButtons: { position: 'absolute', right: 14, bottom: 160, gap: 10 },
  circleBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', elevation: 3, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  circleBtnIcon: { fontSize: 22, color: C.textSec },

  infoBar: { position: 'absolute', bottom: 90, left: 14, right: 14, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 3, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoDot: { width: 10, height: 10, borderRadius: 5 },
  infoCount: { fontSize: 14, fontWeight: '700', color: C.text },
  infoTotal: { flex: 1, textAlign: 'right', fontSize: 12, color: C.textMuted },

  card: { position: 'absolute', bottom: 160, left: 14, right: 70, backgroundColor: C.card, borderRadius: 14, padding: 14, elevation: 5, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  cardBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { flex: 1, fontSize: 11, color: C.textMuted },
  cardType: { fontSize: 11, color: C.textMuted, marginBottom: 4, textTransform: 'capitalize' },
  cardDesc: { fontSize: 13, color: C.textSec, lineHeight: 18, marginBottom: 4 },
  cardCoords: { fontSize: 11, color: C.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  fab: { flex: 1, height: 52, borderRadius: 26, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, elevation: 5, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabPlus: { fontSize: 20, color: '#fff', fontWeight: '300' },
  fabText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  fabRow: { position: 'absolute', bottom: 28, left: 16, right: 16, flexDirection: 'row', gap: 10 },
  navBtn: { height: 52, borderRadius: 26, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20, elevation: 5, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  navBtnText: { fontSize: 14, color: C.text, fontWeight: '700' },

  // Weather
  weatherChip: { position: 'absolute', left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, elevation: 3, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  weatherChipRain: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  weatherChipText: { fontSize: 14, fontWeight: '700', color: C.text },
  weatherAlertBanner: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, elevation: 5, borderWidth: 1, borderColor: '#93C5FD', zIndex: 200 },
  weatherAlertTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },
  weatherAlertBody: { fontSize: 12, color: '#1E40AF', marginTop: 2 },

  // Voting
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderLight },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  voteBtnUp: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  voteBtnDown: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  voteCount: { fontSize: 13, fontWeight: '700', color: C.green },
  voteCountDown: { fontSize: 13, fontWeight: '700', color: C.red },
  trustLabel: { flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '600', color: C.textMuted },
});

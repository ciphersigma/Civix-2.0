import React, { useEffect, useState, useRef } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, TextInput, Keyboard,
  ActivityIndicator, FlatList, StatusBar, Platform, Alert,
  PermissionsAndroid, ScrollView,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiYWxwaGFpbn' + 'N0aW54IiwiYSI6ImNta3A2N3M' + '2dDBldjEzZXFyeTJzeGRhdzMifQ.C7b81YKX5_cWuVFJNOMkoA';

const C = {
  primary: '#6366F1', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
  text: '#1E293B', textSec: '#64748B', textMuted: '#94A3B8',
  red: '#EF4444', orange: '#F97316', yellow: '#EAB308', green: '#10B981', blue: '#3B82F6',
};
const SEV_COLOR: Record<string, string> = { High: C.red, Medium: C.orange, Low: C.yellow };

interface GeoResult { id: string; place_name: string; center: [number, number]; }

const formatDist = (m: number) => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
const formatTime = (s: number) => {
  const mins = Math.round(s / 60);
  if (mins < 60) return mins + ' min';
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
};
const maneuverIcon = (type: string, mod?: string) => {
  if (type === 'arrive') return '🏁';
  if (type === 'depart') return '📍';
  if (mod?.includes('left')) return '↰';
  if (mod?.includes('right')) return '↱';
  if (type === 'roundabout' || type === 'rotary') return '🔄';
  if (mod === 'uturn') return '↩';
  return '↑';
};

export const NavigationScreen = ({ navigation, route: navRoute }: any) => {
  const insets = useSafeAreaInsets();
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(
    navRoute?.params?.destination || null
  );
  const [searchQuery, setSearchQuery] = useState(navRoute?.params?.destination?.name || '');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<'shortest' | 'safe'>('safe');
  const [showSteps, setShowSteps] = useState(false);
  const searchTimer = useRef<any>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const statusBarH = Math.max(insets.top, Platform.OS === 'android' ? 40 : 0);

  useEffect(() => { getLocation(); }, []);

  useEffect(() => {
    if (origin && destination) fetchNavigation();
  }, [origin, destination]);

  const getLocation = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
    }
    Geolocation.getCurrentPosition(
      pos => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOrigin({ lat: 23.0225, lng: 72.5714 }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const fetchNavigation = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    try {
      const res = await api.get('/reports/navigate', {
        params: {
          origin: origin.lat + ',' + origin.lng,
          destination: destination.lat + ',' + destination.lng,
          profile: 'driving',
        },
      });
      setRouteData(res.data);
      setActiveRoute(res.data.safe ? 'safe' : 'shortest');
      fitBounds(res.data);
    } catch (err) {
      console.error('Navigation error:', err);
      Alert.alert('Error', 'Could not compute route');
    } finally { setLoading(false); }
  };

  const fitBounds = (data: any) => {
    if (!cameraRef.current || !origin || !destination) return;
    const coords = [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ];
    (data.allHazards || []).forEach((h: any) => coords.push([h.longitude, h.latitude]));
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    cameraRef.current.fitBounds(
      [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01],
      [Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01],
      60, 500
    );
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || searchQuery.length < 3) { setSearchResults([]); setShowResults(false); return; }
    searchTimer.current = setTimeout(() => geocode(searchQuery.trim()), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  const geocode = async (q: string) => {
    setSearching(true);
    try {
      const lng = origin?.lng || 72.5714;
      const lat = origin?.lat || 23.0225;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${lng},${lat}`;
      const data = await (await fetch(url)).json();
      if (data.features) {
        setSearchResults(data.features.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center })));
        setShowResults(true);
      }
    } catch {} finally { setSearching(false); }
  };

  const selectPlace = (r: GeoResult) => {
    Keyboard.dismiss();
    setSearchQuery(r.place_name.split(',')[0]);
    setShowResults(false);
    setDestination({ lat: r.center[1], lng: r.center[0], name: r.place_name.split(',')[0] });
  };

  const currentRoute = routeData ? (activeRoute === 'safe' && routeData.safe ? routeData.safe : routeData.shortest) : null;
  const currentSteps = currentRoute?.steps || [];
  const hazardCount = currentRoute?.hazards?.count || 0;

  const routeGeoJSON = currentRoute ? {
    type: 'Feature' as const, geometry: currentRoute.geometry, properties: {},
  } : null;

  const altRoute = routeData ? (activeRoute === 'safe' ? routeData.shortest : routeData.safe) : null;
  const altGeoJSON = altRoute ? {
    type: 'Feature' as const, geometry: altRoute.geometry, properties: {},
  } : null;

  return (
    <View style={st.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <MapboxGL.MapView style={StyleSheet.absoluteFillObject} styleURL="mapbox://styles/mapbox/streets-v12" scaleBarEnabled={false}
        onPress={() => { setShowResults(false); Keyboard.dismiss(); }}>
        <MapboxGL.Camera ref={cameraRef} centerCoordinate={[origin?.lng || 72.5714, origin?.lat || 23.0225]} zoomLevel={13} />

        {altGeoJSON && (
          <MapboxGL.ShapeSource id="alt-route" shape={altGeoJSON}>
            <MapboxGL.LineLayer id="alt-route-line" style={{ lineColor: '#94A3B8', lineWidth: 4, lineOpacity: 0.4, lineCap: 'round', lineJoin: 'round' }} />
          </MapboxGL.ShapeSource>
        )}

        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="active-route" shape={routeGeoJSON}>
            <MapboxGL.LineLayer id="active-route-line" style={{
              lineColor: activeRoute === 'safe' ? C.green : C.primary,
              lineWidth: 6, lineOpacity: 0.85, lineCap: 'round', lineJoin: 'round',
            }} />
          </MapboxGL.ShapeSource>
        )}

        {origin && (
          <MapboxGL.PointAnnotation id="origin" coordinate={[origin.lng, origin.lat]}>
            <View style={[st.marker, { backgroundColor: C.green }]}><Text style={st.markerText}>A</Text></View>
          </MapboxGL.PointAnnotation>
        )}

        {destination && (
          <MapboxGL.PointAnnotation id="dest" coordinate={[destination.lng, destination.lat]}>
            <View style={[st.marker, { backgroundColor: C.red }]}><Text style={st.markerText}>B</Text></View>
          </MapboxGL.PointAnnotation>
        )}

        {(routeData?.allHazards || []).map((h: any) => (
          <MapboxGL.PointAnnotation key={h.id} id={'h-' + h.id} coordinate={[h.longitude, h.latitude]}>
            <View style={[st.hazardDot, { backgroundColor: SEV_COLOR[h.severity] || C.yellow }]}>
              <Text style={{ fontSize: 10 }}>⚠</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* Search bar */}
      <View style={[st.searchWrap, { top: statusBarH + 10 }]}>
        <View style={st.searchRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Text style={{ fontSize: 18, color: C.textSec }}>←</Text>
          </TouchableOpacity>
          <View style={st.searchBox}>
            <Text style={{ fontSize: 13, marginRight: 6, opacity: 0.4 }}>📍</Text>
            <TextInput style={st.searchInput} placeholder="Where to?" placeholderTextColor={C.textMuted}
              value={searchQuery} onChangeText={t => { setSearchQuery(t); if (!t.trim()) setShowResults(false); }}
              onFocus={() => { if (searchResults.length) setShowResults(true); }} returnKeyType="search" />
            {searching && <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 4 }} />}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); setRouteData(null); setDestination(null); }}>
                <Text style={{ fontSize: 14, color: C.textMuted, paddingHorizontal: 6 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {showResults && searchResults.length > 0 && (
          <View style={st.dropdown}>
            <FlatList data={searchResults} keyExtractor={i => i.id} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={st.dropItem} onPress={() => selectPlace(item)} activeOpacity={0.6}>
                  <Text style={{ fontSize: 13, marginRight: 8, opacity: 0.4 }}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.dropName} numberOfLines={1}>{item.place_name.split(',')[0]}</Text>
                    <Text style={st.dropAddr} numberOfLines={1}>{item.place_name.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                </TouchableOpacity>
              )} />
          </View>
        )}
      </View>

      {loading && (
        <View style={st.loadingOverlay}>
          <View style={st.loadingCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={{ color: C.textSec, fontSize: 14, marginTop: 10 }}>Computing safest route...</Text>
          </View>
        </View>
      )}

      {/* Bottom panel */}
      {currentRoute && !loading && (
        <View style={st.bottomPanel}>
          {/* Route toggle */}
          {routeData?.safe && routeData?.shortest && (
            <View style={st.toggleRow}>
              <TouchableOpacity
                style={[st.toggleBtn, activeRoute === 'safe' && st.toggleActive]}
                onPress={() => setActiveRoute('safe')} activeOpacity={0.7}>
                <Text style={{ fontSize: 12 }}>🛡</Text>
                <Text style={[st.toggleLabel, activeRoute === 'safe' && st.toggleLabelActive]}>Safe Route</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.toggleBtn, activeRoute === 'shortest' && st.toggleActive]}
                onPress={() => setActiveRoute('shortest')} activeOpacity={0.7}>
                <Text style={{ fontSize: 12 }}>⚡</Text>
                <Text style={[st.toggleLabel, activeRoute === 'shortest' && st.toggleLabelActive]}>Shortest</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Route summary */}
          <View style={st.summaryRow}>
            <View style={st.summaryItem}>
              <Text style={st.summaryValue}>{formatDist(currentRoute.distance)}</Text>
              <Text style={st.summaryLabel}>Distance</Text>
            </View>
            <View style={st.summaryDivider} />
            <View style={st.summaryItem}>
              <Text style={st.summaryValue}>{formatTime(currentRoute.duration)}</Text>
              <Text style={st.summaryLabel}>Duration</Text>
            </View>
            <View style={st.summaryDivider} />
            <View style={st.summaryItem}>
              <Text style={[st.summaryValue, hazardCount > 0 ? { color: C.orange } : { color: C.green }]}>
                {hazardCount > 0 ? hazardCount + ' ⚠' : '0 ✓'}
              </Text>
              <Text style={st.summaryLabel}>Hazards</Text>
            </View>
          </View>

          {hazardCount > 0 && activeRoute === 'safe' && (
            <View style={st.hazardBanner}>
              <Text style={{ fontSize: 12 }}>🛡</Text>
              <Text style={st.hazardBannerText}>Route avoids {routeData.allHazards?.length || 0} waterlogged area(s)</Text>
            </View>
          )}

          {/* Steps toggle */}
          <TouchableOpacity style={st.stepsToggle} onPress={() => setShowSteps(!showSteps)} activeOpacity={0.7}>
            <Text style={st.stepsToggleText}>Turn-by-turn directions</Text>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>{showSteps ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showSteps && currentSteps.length > 0 && (
            <ScrollView style={st.stepsList} nestedScrollEnabled>
              {currentSteps.map((step: any, i: number) => (
                <View key={i} style={st.stepItem}>
                  <Text style={st.stepIcon}>{maneuverIcon(step.maneuver?.type, step.maneuver?.modifier)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.stepInstr} numberOfLines={2}>{step.maneuver?.instruction || step.name || 'Continue'}</Text>
                    <Text style={st.stepDist}>{formatDist(step.distance)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Empty state */}
      {!routeData && !loading && (
        <View style={st.emptyPanel}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>🧭</Text>
          <Text style={st.emptyTitle}>Navigate safely</Text>
          <Text style={st.emptyDesc}>Search for a destination to find the safest route avoiding waterlogged areas</Text>
        </View>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  marker: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff', elevation: 4 },
  markerText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  hazardDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', elevation: 3 },

  searchWrap: { position: 'absolute', left: 14, right: 14, zIndex: 100 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', elevation: 3, borderWidth: 1, borderColor: C.border },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 24, paddingHorizontal: 14, height: 46, elevation: 4, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 },

  dropdown: { backgroundColor: C.card, borderRadius: 14, marginTop: 6, marginLeft: 50, maxHeight: 180, elevation: 5, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  dropName: { fontSize: 14, fontWeight: '600', color: C.text },
  dropAddr: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  loadingCard: { backgroundColor: C.card, borderRadius: 16, padding: 28, alignItems: 'center', elevation: 5 },

  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: Platform.OS === 'android' ? 20 : 34, elevation: 8, borderTopWidth: 1, borderColor: C.border, maxHeight: '55%' },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: C.border },
  toggleActive: { backgroundColor: '#EEF2FF', borderColor: C.primary },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: C.textSec },
  toggleLabelActive: { color: C.primary },

  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: C.text },
  summaryLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: C.border },

  hazardBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  hazardBannerText: { fontSize: 12, color: '#166534', fontWeight: '500' },

  stepsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  stepsToggleText: { fontSize: 13, fontWeight: '600', color: C.textSec },

  stepsList: { maxHeight: 180 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  stepIcon: { fontSize: 16, width: 24, textAlign: 'center', marginTop: 1 },
  stepInstr: { fontSize: 13, color: C.text, lineHeight: 18 },
  stepDist: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  emptyPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, alignItems: 'center', elevation: 5, borderTopWidth: 1, borderColor: C.border },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
});

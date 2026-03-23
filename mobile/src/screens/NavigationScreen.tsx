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

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiYWxwaGFpbn' + 'N0aW54IiwiYSI6ImNta3A2N3M' + '2dDBldjEzZXFyeTJzeGRhdzMifQ.C7b81YKX5_cWuVFJNOMkoA';
const { width: SW } = Dimensions.get('window');

const C = {
  primary: '#6366F1', primaryDark: '#4F46E5', bg: '#F8FAFC', card: '#FFFFFF',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  text: '#1E293B', textSec: '#64748B', textMuted: '#94A3B8',
  red: '#EF4444', orange: '#F97316', yellow: '#EAB308', green: '#10B981',
  greenDark: '#059669', blue: '#3B82F6', dark: '#0F172A', darkCard: '#1E293B',
};
const SEV_COLOR: Record<string, string> = { High: C.red, Medium: C.orange, Low: C.yellow };

interface GeoResult { id: string; place_name: string; center: [number, number]; }

const formatDist = (m: number) => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
const formatTime = (s: number) => {
  const mins = Math.round(s / 60);
  if (mins < 60) return mins + ' min';
  return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
};
const maneuverIcon = (type?: string, mod?: string): string => {
  if (!type) return '⬆';
  if (type === 'arrive') return '🏁';
  if (type === 'depart') return '🚗';
  if (mod?.includes('slight left')) return '↖';
  if (mod?.includes('left')) return '⬅';
  if (mod?.includes('slight right')) return '↗';
  if (mod?.includes('right')) return '➡';
  if (type === 'roundabout' || type === 'rotary') return '🔄';
  if (mod === 'uturn') return '↩';
  if (type === 'merge') return '⤵';
  if (type === 'fork') return '⑂';
  return '⬆';
};
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const [navigating, setNavigating] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [distToNextStep, setDistToNextStep] = useState(0);
  const [eta, setEta] = useState(0);
  const [remainingDist, setRemainingDist] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);

  const searchTimer = useRef<any>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const watchId = useRef<number | null>(null);
  const statusBarH = Math.max(insets.top, Platform.OS === 'android' ? 40 : 0);

  useEffect(() => { getLocation(); }, []);
  useEffect(() => { if (origin && destination) fetchNavigation(); }, [origin, destination]);
  useEffect(() => { return () => { if (watchId.current !== null) Geolocation.clearWatch(watchId.current); }; }, []);

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
        params: { origin: origin.lat + ',' + origin.lng, destination: destination.lat + ',' + destination.lng, profile: 'driving' },
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
    const coords = [[origin.lng, origin.lat], [destination.lng, destination.lat]];
    (data.allHazards || []).forEach((h: any) => coords.push([h.longitude, h.latitude]));
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    cameraRef.current.fitBounds(
      [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01],
      [Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01], 80, 600
    );
  };

  const startNavigation = () => {
    if (!routeData) return;
    setNavigating(true);
    setCurrentStepIdx(0);
    setIsFollowing(true);
    watchId.current = Geolocation.watchPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading || 0 };
        setUserLocation(loc);
        updateNavProgress(loc);
      },
      err => console.error('Watch error:', err),
      { enableHighAccuracy: true, distanceFilter: 5, interval: 2000, fastestInterval: 1000 }
    );
  };

  const updateNavProgress = (loc: { lat: number; lng: number; heading?: number }) => {
    const route = routeData ? (activeRoute === 'safe' && routeData.safe ? routeData.safe : routeData.shortest) : null;
    if (!route) return;
    const steps = route.steps || [];
    if (steps.length === 0) return;
    let closestIdx = currentStepIdx;
    let minDist = Infinity;
    for (let i = Math.max(0, currentStepIdx - 1); i < Math.min(steps.length, currentStepIdx + 3); i++) {
      if (steps[i].startCoord) {
        const d = haversine(loc.lat, loc.lng, steps[i].startCoord[1], steps[i].startCoord[0]);
        if (d < minDist) { minDist = d; closestIdx = i; }
      }
    }
    if (closestIdx > currentStepIdx) setCurrentStepIdx(closestIdx);
    const nextIdx = Math.min(closestIdx + 1, steps.length - 1);
    if (steps[nextIdx]?.startCoord) {
      setDistToNextStep(haversine(loc.lat, loc.lng, steps[nextIdx].startCoord[1], steps[nextIdx].startCoord[0]));
    }
    let remDist = 0, remTime = 0;
    for (let i = closestIdx; i < steps.length; i++) { remDist += steps[i].distance || 0; remTime += steps[i].duration || 0; }
    setRemainingDist(remDist);
    setEta(remTime);
    if (destination) {
      const distToDest = haversine(loc.lat, loc.lng, destination.lat, destination.lng);
      if (distToDest < 30) { stopNavigation(); Alert.alert('You have arrived!', 'You reached your destination.'); }
    }
  };

  const recenter = () => {
    setIsFollowing(true);
  };

  const stopNavigation = () => {
    setNavigating(false);
    setIsFollowing(true);
    if (watchId.current !== null) { Geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (routeData) fitBounds(routeData);
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
      const lng = origin?.lng || 72.5714; const lat = origin?.lat || 23.0225;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${lng},${lat}`;
      const data = await (await fetch(url)).json();
      if (data.features) {
        setSearchResults(data.features.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center })));
        setShowResults(true);
      }
    } catch {} finally { setSearching(false); }
  };

  const selectPlace = (r: GeoResult) => {
    Keyboard.dismiss(); setSearchQuery(r.place_name.split(',')[0]); setShowResults(false);
    setDestination({ lat: r.center[1], lng: r.center[0], name: r.place_name.split(',')[0] });
  };

  const currentRoute = routeData ? (activeRoute === 'safe' && routeData.safe ? routeData.safe : routeData.shortest) : null;
  const allSteps = currentRoute?.steps || [];
  const hazardCount = currentRoute?.hazards?.count || 0;
  const currentStep = allSteps[currentStepIdx] || null;
  const nextStep = allSteps[currentStepIdx + 1] || null;
  const routeGeoJSON = currentRoute ? { type: 'Feature' as const, geometry: currentRoute.geometry, properties: {} } : null;
  const altRoute = routeData ? (activeRoute === 'safe' ? routeData.shortest : routeData.safe) : null;
  const altGeoJSON = altRoute ? { type: 'Feature' as const, geometry: altRoute.geometry, properties: {} } : null;

  return (
    <View style={st.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── MAP ── */}
      <MapboxGL.MapView style={StyleSheet.absoluteFillObject} styleURL="mapbox://styles/mapbox/streets-v12"
        scaleBarEnabled={false} compassEnabled={false}
        onTouchStart={() => { if (navigating) setIsFollowing(false); }}
        onPress={() => { setShowResults(false); Keyboard.dismiss(); }}>
        {origin && !navigating && (
          <MapboxGL.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [origin.lng, origin.lat], zoomLevel: 13 }} />
        )}
        {navigating && isFollowing && (
          <MapboxGL.Camera
            ref={cameraRef}
            followUserLocation={true}
            followUserMode={MapboxGL.UserTrackingMode.FollowWithHeading}
            followZoomLevel={17}
            followPitch={55}
            animationMode="easeTo"
            animationDuration={500}
          />
        )}
        {navigating && !isFollowing && (
          <MapboxGL.Camera ref={cameraRef} />
        )}

        {/* Native location puck with heading — shows during navigation */}
        {navigating && (
          <MapboxGL.LocationPuck
            puckBearing="heading"
            puckBearingEnabled={true}
            pulsing={{ isEnabled: true, color: C.primary, radius: 50 }}
            visible={true}
          />
        )}

        {altGeoJSON && !navigating && (
          <MapboxGL.ShapeSource id="alt-route" shape={altGeoJSON}>
            <MapboxGL.LineLayer id="alt-route-line" style={{ lineColor: '#CBD5E1', lineWidth: 5, lineOpacity: 0.6, lineCap: 'round', lineJoin: 'round' }} />
          </MapboxGL.ShapeSource>
        )}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="active-route" shape={routeGeoJSON}>
            <MapboxGL.LineLayer id="active-route-border" style={{ lineColor: activeRoute === 'safe' ? '#059669' : '#4338CA', lineWidth: navigating ? 10 : 8, lineOpacity: 0.3, lineCap: 'round', lineJoin: 'round' }} />
            <MapboxGL.LineLayer id="active-route-line" style={{ lineColor: activeRoute === 'safe' ? C.green : C.primary, lineWidth: navigating ? 6 : 5, lineOpacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
          </MapboxGL.ShapeSource>
        )}

        {!navigating && origin && (
          <MapboxGL.PointAnnotation id="origin" coordinate={[origin.lng, origin.lat]}>
            <View style={st.originPin}><View style={st.originPinInner} /></View>
          </MapboxGL.PointAnnotation>
        )}
        {destination && (
          <MapboxGL.PointAnnotation id="dest" coordinate={[destination.lng, destination.lat]}>
            <View style={st.destPin}><Text style={st.destPinText}>📍</Text></View>
          </MapboxGL.PointAnnotation>
        )}

        {(routeData?.allHazards || []).map((h: any) => (
          <MapboxGL.PointAnnotation key={h.id} id={'h-' + h.id} coordinate={[h.longitude, h.latitude]}>
            <View style={[st.hazardPin, { backgroundColor: (SEV_COLOR[h.severity] || C.yellow) + '20', borderColor: SEV_COLOR[h.severity] || C.yellow }]}>
              <Text style={{ fontSize: 11 }}>⚠️</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      {/* ── NAVIGATION MODE: Top instruction card ── */}
      {navigating && currentStep && (
        <View style={[st.navTop, { paddingTop: statusBarH + 12 }]}>
          <View style={st.navTopRow}>
            <View style={st.navIconWrap}>
              <Text style={st.navIconText}>{maneuverIcon(currentStep.maneuver?.type, currentStep.maneuver?.modifier)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.navDistLabel}>{formatDist(distToNextStep > 0 ? distToNextStep : currentStep.distance)}</Text>
              <Text style={st.navInstrText} numberOfLines={2}>{currentStep.instruction || 'Continue on route'}</Text>
            </View>
          </View>
          {nextStep && (
            <View style={st.navThenRow}>
              <Text style={st.navThenLabel}>Then</Text>
              <Text style={st.navThenIcon}>{maneuverIcon(nextStep.maneuver?.type, nextStep.maneuver?.modifier)}</Text>
              <Text style={st.navThenText} numberOfLines={1}>{nextStep.instruction || 'Continue'}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── NAVIGATION MODE: Recenter button (always visible) ── */}
      {navigating && (
        <TouchableOpacity
          style={[st.recenterBtn, isFollowing ? st.recenterBtnActive : st.recenterBtnInactive]}
          onPress={recenter}
          activeOpacity={0.8}>
          <Text style={st.recenterIcon}>{isFollowing ? '📍' : '🧭'}</Text>
        </TouchableOpacity>
      )}

      {/* ── NAVIGATION MODE: Bottom bar ── */}
      {navigating && (
        <View style={[st.navBottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={st.navInfoRow}>
            <View style={st.navInfoBlock}>
              <Text style={st.navInfoBig}>{formatTime(eta)}</Text>
              <Text style={st.navInfoSmall}>ETA</Text>
            </View>
            <View style={st.navInfoSep} />
            <View style={st.navInfoBlock}>
              <Text style={st.navInfoBig}>{formatDist(remainingDist)}</Text>
              <Text style={st.navInfoSmall}>Left</Text>
            </View>
            <View style={st.navInfoSep} />
            <View style={st.navInfoBlock}>
              <Text style={[st.navInfoBig, hazardCount > 0 ? { color: C.orange } : { color: C.green }]}>
                {hazardCount > 0 ? hazardCount : '0'}
              </Text>
              <Text style={st.navInfoSmall}>Hazards</Text>
            </View>
          </View>
          <TouchableOpacity style={st.endNavBtn} onPress={stopNavigation} activeOpacity={0.85}>
            <Text style={st.endNavText}>✕  End Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PREVIEW MODE: Search bar ── */}
      {!navigating && (
        <View style={[st.searchWrap, { top: statusBarH + 10 }]}>
          <View style={st.searchRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} activeOpacity={0.7}>
              <Text style={{ fontSize: 20, color: C.text }}>‹</Text>
            </TouchableOpacity>
            <View style={st.searchBox}>
              <Text style={{ fontSize: 14, marginRight: 8, opacity: 0.35 }}>🔍</Text>
              <TextInput style={st.searchInput} placeholder="Where are you going?" placeholderTextColor={C.textMuted}
                value={searchQuery} onChangeText={t => { setSearchQuery(t); if (!t.trim()) setShowResults(false); }}
                onFocus={() => { if (searchResults.length) setShowResults(true); }} returnKeyType="search" />
              {searching && <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 6 }} />}
              {searchQuery.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); setRouteData(null); setDestination(null); }} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16, color: C.textMuted }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {showResults && searchResults.length > 0 && (
            <View style={st.dropdown}>
              <FlatList data={searchResults} keyExtractor={i => i.id} keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={st.dropItem} onPress={() => selectPlace(item)} activeOpacity={0.6}>
                    <View style={st.dropIconWrap}><Text style={{ fontSize: 12 }}>📍</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.dropName} numberOfLines={1}>{item.place_name.split(',')[0]}</Text>
                      <Text style={st.dropAddr} numberOfLines={1}>{item.place_name.split(',').slice(1).join(',').trim()}</Text>
                    </View>
                  </TouchableOpacity>
                )} />
            </View>
          )}
        </View>
      )}

      {/* ── Loading overlay ── */}
      {loading && (
        <View style={st.loadingOverlay}>
          <View style={st.loadingCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.loadingText}>Finding safest route...</Text>
          </View>
        </View>
      )}

      {/* ── PREVIEW MODE: Bottom route panel ── */}
      {currentRoute && !loading && !navigating && (
        <View style={[st.panel, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Route toggle pills */}
          {routeData?.safe && routeData?.shortest && (
            <View style={st.pillRow}>
              <TouchableOpacity style={[st.pill, activeRoute === 'safe' && st.pillActive]}
                onPress={() => setActiveRoute('safe')} activeOpacity={0.7}>
                <Text style={[st.pillEmoji]}>🛡️</Text>
                <Text style={[st.pillLabel, activeRoute === 'safe' && st.pillLabelActive]}>Safe</Text>
                <Text style={[st.pillSub, activeRoute === 'safe' && st.pillSubActive]}>{formatTime(routeData.safe.duration)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.pill, activeRoute === 'shortest' && st.pillActive]}
                onPress={() => setActiveRoute('shortest')} activeOpacity={0.7}>
                <Text style={[st.pillEmoji]}>⚡</Text>
                <Text style={[st.pillLabel, activeRoute === 'shortest' && st.pillLabelActive]}>Fastest</Text>
                <Text style={[st.pillSub, activeRoute === 'shortest' && st.pillSubActive]}>{formatTime(routeData.shortest.duration)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Route summary */}
          <View style={st.summaryCard}>
            <View style={st.summaryCol}>
              <Text style={st.summaryBig}>{formatDist(currentRoute.distance)}</Text>
              <Text style={st.summarySmall}>Distance</Text>
            </View>
            <View style={st.summarySep} />
            <View style={st.summaryCol}>
              <Text style={st.summaryBig}>{formatTime(currentRoute.duration)}</Text>
              <Text style={st.summarySmall}>Duration</Text>
            </View>
            <View style={st.summarySep} />
            <View style={st.summaryCol}>
              <Text style={[st.summaryBig, hazardCount > 0 ? { color: C.orange } : { color: C.green }]}>
                {hazardCount}
              </Text>
              <Text style={st.summarySmall}>Hazards</Text>
            </View>
          </View>

          {hazardCount > 0 && activeRoute === 'safe' && (
            <View style={st.safeBanner}>
              <Text style={{ fontSize: 13 }}>🛡️</Text>
              <Text style={st.safeBannerText}>This route avoids {routeData.allHazards?.length || 0} waterlogged zone(s)</Text>
            </View>
          )}

          {/* Start button */}
          <TouchableOpacity style={st.startBtn} onPress={startNavigation} activeOpacity={0.85}>
            <Text style={st.startBtnIcon}>▶</Text>
            <Text style={st.startBtnText}>Start Navigation</Text>
          </TouchableOpacity>

          {/* Steps accordion */}
          <TouchableOpacity style={st.stepsHeader} onPress={() => setShowSteps(!showSteps)} activeOpacity={0.7}>
            <Text style={st.stepsHeaderText}>Directions ({allSteps.length} steps)</Text>
            <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>{showSteps ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>

          {showSteps && allSteps.length > 0 && (
            <ScrollView style={st.stepsList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {allSteps.map((step: any, i: number) => (
                <View key={i} style={[st.stepRow, i === allSteps.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={st.stepIconWrap}>
                    <Text style={st.stepIconText}>{maneuverIcon(step.maneuver?.type, step.maneuver?.modifier)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.stepInstr} numberOfLines={2}>{step.instruction || 'Continue'}</Text>
                    <Text style={st.stepMeta}>{formatDist(step.distance)} · {formatTime(step.duration)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── Empty state ── */}
      {!routeData && !loading && !navigating && (
        <View style={[st.emptyPanel, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={st.emptyIconWrap}><Text style={{ fontSize: 32 }}>🧭</Text></View>
          <Text style={st.emptyTitle}>Navigate safely</Text>
          <Text style={st.emptyDesc}>Search a destination above to find the safest route that avoids waterlogged areas</Text>
        </View>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Map markers
  userDotWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  userDotPulse: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99,102,241,0.2)' },
  userDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, borderWidth: 3, borderColor: '#fff', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  originPin: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.25)', alignItems: 'center', justifyContent: 'center' },
  originPinInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.green, borderWidth: 2, borderColor: '#fff', elevation: 3 },
  destPin: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.red, elevation: 4 },
  destPinText: { fontSize: 14 },
  hazardPin: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, elevation: 3 },

  // Navigation top card
  navTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.dark, paddingHorizontal: 20, paddingBottom: 16, zIndex: 100, elevation: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  navTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' },
  navIconText: { fontSize: 28 },
  navDistLabel: { fontSize: 22, fontWeight: '800', color: '#4ADE80', letterSpacing: -0.5 },
  navInstrText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginTop: 2 },
  navThenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  navThenLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  navThenIcon: { fontSize: 14 },
  navThenText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', flex: 1 },

  // Recenter button
  recenterBtn: { position: 'absolute', right: 16, bottom: 180, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, zIndex: 50 },
  recenterBtnActive: { backgroundColor: '#EEF2FF', borderWidth: 2, borderColor: C.primary },
  recenterBtnInactive: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  recenterIcon: { fontSize: 22 },

  // Navigation bottom bar
  navBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 18, elevation: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: C.borderLight },
  navInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  navInfoBlock: { flex: 1, alignItems: 'center' },
  navInfoBig: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  navInfoSmall: { fontSize: 11, color: C.textMuted, marginTop: 2, fontWeight: '500' },
  navInfoSep: { width: 1, height: 32, backgroundColor: C.border },
  endNavBtn: { backgroundColor: '#FEE2E2', borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  endNavText: { color: C.red, fontSize: 15, fontWeight: '700' },

  // Search
  searchWrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', elevation: 4, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 22, paddingHorizontal: 16, height: 48, elevation: 4, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  searchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0 },
  dropdown: { backgroundColor: C.card, borderRadius: 16, marginTop: 8, marginLeft: 54, elevation: 6, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight },
  dropIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dropName: { fontSize: 14, fontWeight: '600', color: C.text },
  dropAddr: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  // Loading
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.2)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  loadingCard: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 32, paddingVertical: 28, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16 },
  loadingText: { color: C.textSec, fontSize: 14, marginTop: 14, fontWeight: '500' },

  // Preview panel
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, elevation: 10, borderTopWidth: 1, borderColor: C.borderLight, maxHeight: '65%' },
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: 'transparent' },
  pillActive: { backgroundColor: '#EEF2FF', borderColor: C.primary },
  pillEmoji: { fontSize: 14 },
  pillLabel: { fontSize: 14, fontWeight: '700', color: C.textSec },
  pillLabelActive: { color: C.primary },
  pillSub: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  pillSubActive: { color: C.primary },

  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: C.borderLight },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryBig: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  summarySmall: { fontSize: 11, color: C.textMuted, marginTop: 3, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  summarySep: { width: 1, height: 32, backgroundColor: C.border },

  safeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  safeBannerText: { fontSize: 13, color: '#065F46', fontWeight: '600', flex: 1 },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, marginBottom: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  startBtnIcon: { fontSize: 14, color: '#fff' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  stepsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  stepsHeaderText: { fontSize: 14, fontWeight: '600', color: C.text },
  stepsList: { maxHeight: 200 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight },
  stepIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  stepIconText: { fontSize: 16 },
  stepInstr: { fontSize: 14, color: C.text, lineHeight: 19 },
  stepMeta: { fontSize: 12, color: C.textMuted, marginTop: 3 },

  // Empty state
  emptyPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center', elevation: 6, borderTopWidth: 1, borderColor: C.borderLight },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: SW * 0.75 },
});

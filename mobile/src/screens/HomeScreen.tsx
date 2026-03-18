import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
  StatusBar,
  Animated,
  FlatList,
  PermissionsAndroid,
  Platform,
  Modal,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';

const MAPBOX_TOKEN =
  'pk.eyJ1IjoiYWxwaGFpbn' + 'N0aW54IiwiYSI6ImNta3A2N3M' + '2dDBldjEzZXFyeTJzeGRhdzMifQ.C7b81YKX5_cWuVFJNOMkoA';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

const SEVERITY_COLORS: Record<string, string> = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#22C55E',
};

interface GeoResult {
  id: string;
  place_name: string;
  center: [number, number];
}

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location to show nearby waterlogging reports.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
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
  const [profileVisible, setProfileVisible] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimer = useRef<any>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Use at least 44px for status bar on Android, or insets.top
  const statusBarHeight = Math.max(insets.top, Platform.OS === 'android' ? 40 : 0);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: selectedReport ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
  }, [selectedReport]);

  // Debounced geocoding
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimer.current = setTimeout(() => geocodeSearch(searchQuery.trim()), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  const init = async () => {
    const offline = await AuthService.isOfflineMode();
    setIsOffline(offline);
    const count = await ReportService.getPendingCount();
    setPendingCount(count);
    const authData = await AuthService.getAuthData();
    if (authData?.phone) setUserPhone(authData.phone);

    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      getCurrentLocation();
    } else {
      loadReports();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        setHasLocation(true);
        cameraRef.current?.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          zoomLevel: 14,
          animationDuration: 600,
        });
        loadReports(coords.latitude, coords.longitude);
      },
      err => {
        console.log('Location error:', err);
        loadReports();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const goToMyLocation = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please enable location in your phone settings.');
      return;
    }
    Geolocation.getCurrentPosition(
      pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(coords);
        setHasLocation(true);
        cameraRef.current?.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          zoomLevel: 15,
          animationDuration: 800,
        });
      },
      () => Alert.alert('Error', 'Could not get your location.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, []);

  const loadReports = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      const data = await ReportService.getAreaReports(lat || location.latitude, lng || location.longitude);
      setReports(data);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const geocodeSearch = async (query: string) => {
    setSearching(true);
    try {
      const prox = `${location.longitude},${location.latitude}`;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&proximity=${prox}&types=place,locality,neighborhood,address,poi`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features) {
        setSearchResults(data.features.map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center })));
        setShowResults(true);
      }
    } catch (err) {
      console.log('Geocode error:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectPlace = (result: GeoResult) => {
    Keyboard.dismiss();
    setSearchQuery(result.place_name.split(',')[0]);
    setShowResults(false);
    setSearchResults([]);
    cameraRef.current?.setCamera({
      centerCoordinate: result.center,
      zoomLevel: 14,
      animationDuration: 1000,
    });
  };

  const handleSync = async () => {
    if (pendingCount === 0) return;
    try {
      const result = await ReportService.syncPendingReports();
      if (result.synced > 0) {
        Alert.alert('Synced', `${result.synced} report(s) uploaded`);
        setPendingCount(result.failed);
        loadReports();
      }
    } catch { Alert.alert('Error', 'Sync failed'); }
  };

  const handleLogout = () => {
    setProfileVisible(false);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const totalReports = reports.length;
  const highCount = reports.filter((r: any) => r.severity === 'High').length;
  const medCount = reports.filter((r: any) => r.severity === 'Medium').length;
  const lowCount = reports.filter((r: any) => r.severity === 'Low').length;
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Full-screen map */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL="mapbox://styles/mapbox/streets-v12"
        onPress={() => { setSelectedReport(null); setShowResults(false); Keyboard.dismiss(); }}>
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[location.longitude, location.latitude]}
          zoomLevel={13}
        />

        {hasLocation && (
          <MapboxGL.PointAnnotation id="user-loc" coordinate={[location.longitude, location.latitude]}>
            <View style={styles.blueDotOuter}>
              <View style={styles.blueDotInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {reports.map((report: any) => {
          const lng = report.location?.longitude || report.longitude;
          const lat = report.location?.latitude || report.latitude;
          const color = SEVERITY_COLORS[report.severity] || '#22C55E';
          return (
            <MapboxGL.PointAnnotation
              key={report.id}
              id={`r-${report.id}`}
              coordinate={[lng, lat]}
              onSelected={() => setSelectedReport(report)}>
              <View style={[styles.pin, { backgroundColor: color }]}>
                <Text style={styles.pinText}>💧</Text>
              </View>
            </MapboxGL.PointAnnotation>
          );
        })}
      </MapboxGL.MapView>

      {/* Search bar — positioned below status bar */}
      <View style={[styles.searchWrap, { top: statusBarHeight + 10 }]}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search a place..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={t => { setSearchQuery(t); if (!t.trim()) setShowResults(false); }}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 4 }} />}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
          {/* Profile button inside search bar */}
          <TouchableOpacity onPress={() => setProfileVisible(true)} style={styles.profileBtn}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {showResults && searchResults.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={searchResults}
              keyExtractor={i => i.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dropItem} onPress={() => selectPlace(item)} activeOpacity={0.6}>
                  <Text style={styles.dropPin}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dropName} numberOfLines={1}>{item.place_name.split(',')[0]}</Text>
                    <Text style={styles.dropAddr} numberOfLines={1}>{item.place_name.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Offline banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { top: statusBarHeight + 68 }]}>
          <Text style={styles.offlineLabel}>📡 Offline</Text>
          {pendingCount > 0 && (
            <TouchableOpacity onPress={handleSync} style={styles.syncBtn}>
              <Text style={styles.syncLabel}>Sync {pendingCount}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Right side buttons */}
      <View style={styles.sideButtons}>
        <TouchableOpacity style={styles.circleBtn} onPress={goToMyLocation} activeOpacity={0.7}>
          <Text style={styles.circleBtnIcon}>◎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleBtn} onPress={() => loadReports()} activeOpacity={0.7}>
          <Text style={styles.circleBtnIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoChip}>
          <View style={[styles.infoDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.infoCount}>{highCount}</Text>
        </View>
        <View style={styles.infoChip}>
          <View style={[styles.infoDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.infoCount}>{medCount}</Text>
        </View>
        <View style={styles.infoChip}>
          <View style={[styles.infoDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.infoCount}>{lowCount}</Text>
        </View>
        <Text style={styles.infoTotal}>{totalReports} reports nearby</Text>
        {loading && <ActivityIndicator size="small" color="#6366F1" />}
      </View>

      {/* Selected report card */}
      {selectedReport && (
        <Animated.View style={[styles.card, { transform: [{ translateY: cardTranslateY }] }]}>
          <View style={styles.cardRow}>
            <View style={[styles.cardBadge, { backgroundColor: SEVERITY_COLORS[selectedReport.severity] }]}>
              <Text style={styles.cardBadgeText}>{selectedReport.severity}</Text>
            </View>
            <Text style={styles.cardDate}>
              {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : 'Recent'}
            </Text>
            <TouchableOpacity onPress={() => setSelectedReport(null)} style={{ padding: 4 }}>
              <Text style={styles.cardCloseBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {selectedReport.description || 'No description'}
          </Text>
        </Animated.View>
      )}

      {/* Report FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Report', { location })}
        activeOpacity={0.85}>
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>Report</Text>
      </TouchableOpacity>

      {/* Profile Modal */}
      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
          <View style={[styles.profileMenu, { marginTop: statusBarHeight + 64 }]}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{userPhone || 'Guest User'}</Text>
                <Text style={styles.profileStatus}>{isOffline ? '📡 Offline' : '🟢 Online'}</Text>
              </View>
            </View>
            <View style={styles.profileDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout} activeOpacity={0.6}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Blue dot
  blueDotOuter: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(66,133,244,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  blueDotInner: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#4285F4',
    borderWidth: 2.5, borderColor: '#fff', elevation: 3,
  },

  // Pins
  pin: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
  },
  pinText: { fontSize: 13 },

  // Offline
  offlineBanner: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', elevation: 3,
  },
  offlineLabel: { flex: 1, color: '#92400E', fontWeight: '600', fontSize: 13 },
  syncBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  syncLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Search
  searchWrap: {
    position: 'absolute', left: 14, right: 14, zIndex: 100,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 28,
    paddingHorizontal: 14, height: 50, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8,
  },
  searchIcon: { fontSize: 15, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', paddingVertical: 0 },
  clearBtn: { fontSize: 15, color: '#9CA3AF', paddingHorizontal: 6, paddingVertical: 4 },
  profileBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  profileIcon: { fontSize: 16 },

  dropdown: {
    backgroundColor: '#fff', borderRadius: 16, marginTop: 6, maxHeight: 180,
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  dropPin: { fontSize: 14, marginRight: 10, opacity: 0.6 },
  dropName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  dropAddr: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  // Side buttons
  sideButtons: {
    position: 'absolute', right: 14, bottom: 160, gap: 10,
  },
  circleBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
  },
  circleBtnIcon: { fontSize: 22, color: '#374151' },

  // Info bar
  infoBar: {
    position: 'absolute', bottom: 90, left: 14, right: 14,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoDot: { width: 10, height: 10, borderRadius: 5 },
  infoCount: { fontSize: 14, fontWeight: '700', color: '#374151' },
  infoTotal: { flex: 1, textAlign: 'right', fontSize: 12, color: '#9CA3AF' },

  // Card
  card: {
    position: 'absolute', bottom: 160, left: 14, right: 70, backgroundColor: '#fff',
    borderRadius: 14, padding: 14, elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  cardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardDate: { flex: 1, fontSize: 11, color: '#9CA3AF' },
  cardCloseBtn: { fontSize: 16, color: '#9CA3AF' },
  cardDesc: { fontSize: 13, color: '#374151', lineHeight: 18 },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, left: 16, right: 16, height: 52, borderRadius: 26,
    backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, elevation: 6,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabPlus: { fontSize: 20, color: '#fff', fontWeight: '300' },
  fabText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  // Profile modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  profileMenu: {
    marginHorizontal: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
  },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 20 },
  profileName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  profileStatus: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  profileDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  profileMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
});

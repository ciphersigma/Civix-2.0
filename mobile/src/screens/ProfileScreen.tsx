import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  StatusBar, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/AuthService';
import { ReportService } from '../services/ReportService';
import { api } from '../services/api';

interface UserProfile {
  email: string;
  fullName?: string;
  userId: string;
  totalReports: number;
  pendingReports: number;
  memberSince: string;
}

export const ProfileScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const auth = await AuthService.getAuthData();
      if (!auth) { navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); return; }
      const pendingCount = await ReportService.getPendingCount();
      let serverName = auth.fullName || '';
      let userEmail = auth.email || '';
      let totalReports = 0;
      let memberSince = '';
      try {
        const res = await api.get('/auth/me');
        if (res && res.data) {
          serverName = res.data.full_name || res.data.fullName || auth.fullName || '';
          userEmail = res.data.email || auth.email || '';
          totalReports = res.data.daily_report_count || 0;
          memberSince = res.data.created_at || '';
        }
      } catch (apiErr) {
        console.log('Profile API error:', apiErr);
      }
      setProfile({ email: userEmail, fullName: serverName, userId: auth.userId, totalReports, pendingReports: pendingCount, memberSince });
    } catch (e) { console.error('Profile load error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [navigation]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  const onRefresh = () => { setRefreshing(true); loadProfile(); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await AuthService.logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); } },
    ]);
  };

  const handleSync = async () => {
    if (!profile || profile.pendingReports === 0) return;
    try {
      const res = await ReportService.syncPendingReports();
      Alert.alert('Sync Complete', `${res.synced} report(s) synced.`);
      loadProfile();
    } catch { Alert.alert('Error', 'Sync failed.'); }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name?.trim()) return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return '?';
  };

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
        <View style={s.loadingWrap}><ActivityIndicator size="large" color="#6366F1" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} tintColor="#6366F1" />}
        showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={s.backIcon}>←</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar */}
        <View style={s.avatarCard}>
          <View style={s.avatarGlow}>
            <View style={s.avatarCircle}><Text style={s.avatarText}>{getInitials(profile?.fullName, profile?.email)}</Text></View>
          </View>
          <Text style={s.userName}>{profile?.fullName || 'CIVIX User'}</Text>
          <Text style={s.userEmail}>{profile?.email}</Text>
          {profile?.memberSince ? (
            <View style={s.memberBadge}>
              <View style={s.memberDot} />
              <Text style={s.memberText}>Member since {formatDate(profile.memberSince)}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNumber}>{profile?.totalReports || 0}</Text>
            <Text style={s.statLabel}>Reports Today</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNumber, { color: '#EAB308' }]}>{profile?.pendingReports || 0}</Text>
            <Text style={s.statLabel}>Pending Sync</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>Activity</Text>
          <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('Home')} activeOpacity={0.6}>
            <View style={[s.menuIconWrap, { backgroundColor: '#EEF2FF' }]}><Text style={s.menuIcon}>🗺️</Text></View>
            <View style={s.menuContent}><Text style={s.menuLabel}>View Map</Text><Text style={s.menuDesc}>See nearby waterlogging reports</Text></View>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('Report')} activeOpacity={0.6}>
            <View style={[s.menuIconWrap, { backgroundColor: '#ECFDF5' }]}><Text style={s.menuIcon}>📝</Text></View>
            <View style={s.menuContent}><Text style={s.menuLabel}>New Report</Text><Text style={s.menuDesc}>Report a waterlogged area</Text></View>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
          {(profile?.pendingReports || 0) > 0 && (
            <TouchableOpacity style={s.menuItem} onPress={handleSync} activeOpacity={0.6}>
              <View style={[s.menuIconWrap, { backgroundColor: '#FEF9C3' }]}><Text style={s.menuIcon}>🔄</Text></View>
              <View style={s.menuContent}><Text style={s.menuLabel}>Sync Reports</Text><Text style={s.menuDesc}>{profile?.pendingReports} report(s) waiting</Text></View>
              <Text style={s.menuArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>About</Text>
          <View style={s.menuItem}>
            <View style={[s.menuIconWrap, { backgroundColor: '#F5F3FF' }]}><Text style={s.menuIcon}>ℹ️</Text></View>
            <View style={s.menuContent}><Text style={s.menuLabel}>App Version</Text><Text style={s.menuDesc}>CIVIX v1.0.0</Text></View>
          </View>
          <View style={s.menuItem}>
            <View style={[s.menuIconWrap, { backgroundColor: '#EEF2FF' }]}><Text style={s.menuIcon}>🌊</Text></View>
            <View style={s.menuContent}><Text style={s.menuLabel}>Waterlogging Alert System</Text><Text style={s.menuDesc}>Community-driven flood reporting</Text></View>
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={{ fontSize: 18 }}>🚪</Text>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  backIcon: { fontSize: 20, color: '#64748B' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },

  avatarCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  avatarGlow: { width: 88, height: 88, borderRadius: 44, marginBottom: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C7D2FE' },
  avatarCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE' },
  memberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  memberText: { fontSize: 12, color: '#6366F1', fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#6366F1', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  menuSection: { marginBottom: 16 },
  menuSectionTitle: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  menuIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIcon: { fontSize: 20 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  menuDesc: { fontSize: 12, color: '#94A3B8' },
  menuArrow: { fontSize: 22, color: '#CBD5E1', fontWeight: '300' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 16, marginTop: 8, gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});

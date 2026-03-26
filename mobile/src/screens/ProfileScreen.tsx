import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/AuthService';
import { ReportService } from '../services/ReportService';
import { api } from '../services/api';
import { Theme as T } from '../components/ui';
import { useLang } from '../contexts/LanguageContext';
import { LANG_LABELS, Lang } from '../i18n/translations';

interface UserProfile { email: string; fullName?: string; userId: string; totalReports: number; pendingReports: number; memberSince: string; }

export const ProfileScreen = ({ navigation }: any) => {
  const { lang, setLang, t } = useLang();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const auth = await AuthService.getAuthData();
      if (!auth) { navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); return; }
      const pending = await ReportService.getPendingCount();
      let name = auth.fullName || '', email = auth.email || '', total = 0, since = '';
      try {
        const r = await api.get('/auth/me');
        if (r?.data) { name = r.data.full_name || r.data.fullName || name; email = r.data.email || email; total = r.data.daily_report_count || 0; since = r.data.created_at || ''; }
      } catch {}
      setProfile({ email, fullName: name, userId: auth.userId, totalReports: total, pendingReports: pending, memberSince: since });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [navigation]);

  useEffect(() => { load(); }, [load]);

  const logout = () => Alert.alert('Logout', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => { await AuthService.logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); } },
  ]);

  if (loading) return (
    <SafeAreaView style={s.root}><StatusBar backgroundColor={T.bg} barStyle="dark-content" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={T.primary} /></View>
    </SafeAreaView>
  );

  const trustScore = 87; // placeholder — could compute from vote data
  const helped = 156; // placeholder

  return (
    <SafeAreaView style={s.root}>
      <StatusBar backgroundColor={T.bg} barStyle="dark-content" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[T.primary]} />}>

        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={{ fontSize: 18, color: T.textSec }}>←</Text></TouchableOpacity>
        <Text style={s.title}>{t('profile')}</Text>

        {/* User card */}
        <View style={s.userCard}>
          <View style={s.avatar}><Text style={{ fontSize: 22, color: '#fff' }}>👤</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{profile?.fullName || 'Civix User'}</Text>
            <Text style={s.email}>✉ {profile?.email}</Text>
          </View>
        </View>

        {/* Trust score */}
        <View style={s.trustCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.trustIcon}><Text style={{ fontSize: 16 }}>📈</Text></View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>{t('trustScore')}</Text>
                <Text style={{ fontSize: 12, color: T.textMuted }}>{t('communityReliability')}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: T.text }}>{trustScore}</Text>
              <Text style={{ fontSize: 11, color: T.textMuted }}>{t('outOf100')}</Text>
            </View>
          </View>
          <View style={s.trustBar}><View style={[s.trustFill, { width: `${trustScore}%` }]} /></View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#EEF2FF' }]}><Text style={{ fontSize: 16 }}>📍</Text></View>
            <Text style={s.statNum}>{profile?.totalReports || 0}</Text>
            <Text style={s.statLabel}>{t('reports')}</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#FEF3C7' }]}><Text style={{ fontSize: 16 }}>🏅</Text></View>
            <Text style={s.statNum}>{helped}</Text>
            <Text style={s.statLabel}>{t('helped')}</Text>
          </View>
        </View>

        {/* Achievements */}
        <Text style={s.sectionTitle}>{t('achievements')}</Text>
        <View style={s.achieveCard}>
          <View style={[s.achieveIcon, { backgroundColor: '#FEF3C7' }]}><Text style={{ fontSize: 18 }}>🏅</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.achieveName}>{t('communityHero')}</Text>
            <Text style={s.achieveDesc}>{t('submitted20')}</Text>
          </View>
        </View>
        <View style={s.achieveCard}>
          <View style={[s.achieveIcon, { backgroundColor: '#ECFDF5' }]}><Text style={{ fontSize: 18 }}>🛡</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.achieveName}>{t('safetyChampion')}</Text>
            <Text style={s.achieveDesc}>{t('helped100')}</Text>
          </View>
        </View>

        {/* Language picker */}
        <Text style={s.sectionTitle}>{t('language')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['en', 'hi', 'gu'] as Lang[]).map(l => (
            <TouchableOpacity key={l}
              style={[s.langBtn, lang === l && s.langBtnActive]}
              onPress={() => setLang(l)} activeOpacity={0.7}>
              <Text style={[s.langTxt, lang === l && s.langTxtActive]}>{LANG_LABELS[l]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={{ fontSize: 16 }}>🚪</Text>
          <Text style={s.logoutTxt}>{t('logout')}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: T.text, marginBottom: 16 },

  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: T.text },
  email: { fontSize: 13, color: T.textMuted, marginTop: 2 },

  trustCard: { backgroundColor: T.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  trustIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  trustBar: { height: 6, borderRadius: 3, backgroundColor: T.borderLight, overflow: 'hidden' },
  trustFill: { height: '100%', borderRadius: 3, backgroundColor: T.green },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: T.card, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statNum: { fontSize: 24, fontWeight: '800', color: T.text },
  statLabel: { fontSize: 12, color: T.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 8 },
  achieveCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
  achieveIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  achieveName: { fontSize: 14, fontWeight: '700', color: T.text },
  achieveDesc: { fontSize: 12, color: T.textMuted, marginTop: 2 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 14, marginTop: 16, borderWidth: 1, borderColor: '#FECACA' },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: T.red },

  langBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: T.borderLight },
  langBtnActive: { backgroundColor: T.primary },
  langTxt: { fontSize: 13, fontWeight: '600', color: T.textMuted },
  langTxtActive: { color: '#fff' },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar, Image,
} from 'react-native';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import { Theme } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const SEV = [
  { key: 'Low', icon: 'water-outline', label: 'low', desc: 'anklDeep', color: Theme.green },
  { key: 'Medium', icon: 'water', label: 'medium', desc: 'kneeDeep', color: Theme.yellow },
  { key: 'High', icon: 'water-alert', label: 'high', desc: 'waistPlus', color: Theme.red },
];

export const ReportScreen = ({ navigation, route }: any) => {
  const { colors: c } = useTheme();
  const { t } = useLang();
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState(
    route.params?.location || { latitude: 23.0225, longitude: 72.5714 },
  );
  const [userId, setUserId] = useState('guest');

  useEffect(() => { loadUserData(); getLoc(); }, []);

  const loadUserData = async () => {
    const auth = await AuthService.getAuthData();
    if (auth) setUserId(auth.userId);
  };

  const getLoc = () => {
    Geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const pickPhoto = () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: () => launchCamera({ mediaType: 'photo', maxWidth: 800, maxHeight: 800, quality: 0.5, includeBase64: true }, handlePhoto) },
      { text: 'Gallery', onPress: () => launchImageLibrary({ mediaType: 'photo', maxWidth: 800, maxHeight: 800, quality: 0.5, includeBase64: true }, handlePhoto) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePhoto = (res: any) => {
    if (res.didCancel || res.errorCode) return;
    const asset = res.assets?.[0];
    if (asset?.base64) setPhoto(asset.base64);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please describe the waterlogging situation.');
      return;
    }
    setLoading(true);
    try {
      await ReportService.submitReport({
        latitude: location.latitude,
        longitude: location.longitude,
        severity,
        description: description.trim(),
        userId,
        photo: photo || undefined,
      });
      setLoading(false);
      let msg = 'Thank you for reporting!';
      try { if (await AuthService.isOfflineMode()) msg = 'Saved locally. Will sync when online.'; } catch {}
      Alert.alert('Report Submitted', msg, [{ text: 'OK', onPress: () => { try { navigation.goBack(); } catch {} } }]);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error?.message || error?.response?.data?.message || 'Failed to submit.');
    }
  };

  return (
    <KeyboardAvoidingView style={[s.root, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: c.bg }}>
        <StatusBar backgroundColor={c.bg} barStyle={c.statusBar} />
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: c.card }]}>
            <Icon name="arrow-left" size={20} color={c.textSec} />
          </TouchableOpacity>
          <Text style={[s.title, { color: c.text }]}>{t('report')}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Location */}
        <View style={[s.locCard, { backgroundColor: c.card }]}>
          <Icon name="map-marker" size={22} color={Theme.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.locLabel, { color: c.text }]}>{t('currentLocation')}</Text>
            <Text style={s.locCoords}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
          </View>
          <TouchableOpacity onPress={getLoc} style={[s.locRefresh, { backgroundColor: c.cardAlt }]}>
            <Icon name="crosshairs-gps" size={16} color={c.textSec} />
          </TouchableOpacity>
        </View>

        {/* Severity — tap chips */}
        <Text style={[s.label, { color: c.text }]}>{t('howSevere')}</Text>
        <View style={s.sevRow}>
          {SEV.map(opt => {
            const on = severity === opt.key;
            return (
              <TouchableOpacity key={opt.key}
                style={[s.sevChip, { backgroundColor: on ? opt.color + '15' : c.card, borderColor: on ? opt.color : c.border }]}
                onPress={() => setSeverity(opt.key)} disabled={loading} activeOpacity={0.7}>
                <Icon name={opt.icon} size={24} color={on ? opt.color : c.textMuted} />
                <Text style={[s.sevLabel, { color: on ? opt.color : c.textSec }]}>{t(opt.label)}</Text>
                <Text style={[s.sevDesc, { color: c.textMuted }]}>{t(opt.desc)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={[s.label, { color: c.text }]}>{t('whatsHappening')}</Text>
        <TextInput
          style={[s.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
          placeholder={t('descPlaceholder')}
          placeholderTextColor={c.textMuted}
          value={description} onChangeText={setDescription}
          multiline numberOfLines={4} editable={!loading} textAlignVertical="top" />

        {/* Photo */}
        <TouchableOpacity style={[s.photoBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={pickPhoto} activeOpacity={0.7}>
          {photo ? (
            <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={s.photoPreview} />
          ) : (
            <View style={s.photoPlaceholder}>
              <Icon name="camera-plus-outline" size={28} color={c.textMuted} />
              <Text style={[s.photoTxt, { color: c.textMuted }]}>Add photo evidence</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submit, loading && { opacity: 0.55 }]}
          onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Icon name="send" size={18} color="#fff" />
              <Text style={s.submitTxt}>{t('submitReport')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },

  // Location
  locCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  locLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  locCoords: { fontSize: 12, color: Theme.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  locRefresh: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Severity
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  sevRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  sevChip: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 16, borderWidth: 1.5, gap: 4 },
  sevLabel: { fontSize: 13, fontWeight: '700' },
  sevDesc: { fontSize: 11 },

  // Input
  input: { borderRadius: 12, padding: 16, fontSize: 14, minHeight: 96, marginBottom: 24, borderWidth: 1, lineHeight: 22 },

  // Submit
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: Theme.primary, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Photo
  photoBtn: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginBottom: 24, overflow: 'hidden' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  photoTxt: { fontSize: 13 },
  photoPreview: { width: '100%', height: 180, borderRadius: 12 },
});

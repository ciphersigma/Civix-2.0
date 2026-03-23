import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  StatusBar,
} from 'react-native';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';

const SEVERITY_OPTIONS = [
  { key: 'Low', emoji: '🟡', label: 'Low', desc: 'Ankle deep', color: '#EAB308' },
  { key: 'Medium', emoji: '🟠', label: 'Medium', desc: 'Knee deep', color: '#F97316' },
  { key: 'High', emoji: '🔴', label: 'High', desc: 'Waist+', color: '#EF4444' },
];

export const ReportScreen = ({ navigation, route }: any) => {
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(
    route.params?.location || { latitude: 23.0225, longitude: 72.5714 },
  );
  const [userId, setUserId] = useState('guest');

  useEffect(() => { loadUserData(); getCurrentLocation(); }, []);

  const loadUserData = async () => {
    const auth = await AuthService.getAuthData();
    if (auth) setUserId(auth.userId);
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
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
      });

      setLoading(false);

      let msg = 'Thank you for reporting!';
      try {
        const offline = await AuthService.isOfflineMode();
        if (offline) msg = 'Saved locally. It will sync when you\'re back online.';
      } catch (e) {}

      Alert.alert('Report Submitted', msg, [{
        text: 'OK',
        onPress: () => {
          try { navigation.goBack(); } catch (e) {}
        },
      }]);
    } catch (error: any) {
      setLoading(false);
      const errMsg =
        error?.message ||
        error?.response?.data?.message ||
        'Failed to submit report. Please try again.';
      Alert.alert('Error', errMsg);
    }
  };

  return (
    <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: '#F8FAFC' }}>
        <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Text style={st.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Report Waterlogging</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {/* Location */}
        <View style={st.locationCard}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.locationLabel}>Your Location</Text>
            <Text style={st.locationCoords}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text>
          </View>
          <TouchableOpacity onPress={getCurrentLocation} style={{ padding: 8 }}>
            <Text style={{ fontSize: 18 }}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Severity */}
        <Text style={st.sectionTitle}>Severity Level</Text>
        <View style={st.severityRow}>
          {SEVERITY_OPTIONS.map(opt => {
            const active = severity === opt.key;
            return (
              <TouchableOpacity key={opt.key}
                style={[st.severityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '12' }]}
                onPress={() => setSeverity(opt.key)} disabled={loading} activeOpacity={0.7}>
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{opt.emoji}</Text>
                <Text style={[st.severityLabel, active && { color: opt.color }]}>{opt.label}</Text>
                <Text style={st.severityDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={st.sectionTitle}>Description</Text>
        <TextInput style={st.textArea}
          placeholder="What does the waterlogging look like? How deep is it? Is the road blocked?"
          placeholderTextColor="#94A3B8" value={description} onChangeText={setDescription}
          multiline numberOfLines={5} editable={!loading} textAlignVertical="top" />

        {/* Submit */}
        <TouchableOpacity style={[st.submitBtn, loading && st.submitDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={st.submitText}>Submit Report</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  backIcon: { fontSize: 20, color: '#64748B' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  scroll: { padding: 20, paddingBottom: 40 },

  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  locationLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  locationCoords: { fontSize: 12, color: '#6366F1', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 12 },

  severityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  severityCard: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, borderWidth: 2, borderColor: '#E2E8F0' },
  severityLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  severityDesc: { fontSize: 11, color: '#94A3B8' },

  textArea: { backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 15, color: '#1E293B', minHeight: 120, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', lineHeight: 22 },

  submitBtn: { backgroundColor: '#6366F1', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitDisabled: { backgroundColor: '#A5B4FC' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});

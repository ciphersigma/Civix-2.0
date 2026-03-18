import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';
import Geolocation from 'react-native-geolocation-service';

const SEVERITY_OPTIONS = [
  { key: 'Low', emoji: '🟢', label: 'Low', desc: 'Ankle deep', color: '#22C55E' },
  { key: 'Medium', emoji: '🟠', label: 'Medium', desc: 'Knee deep', color: '#F59E0B' },
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

  useEffect(() => {
    loadUserData();
    getCurrentLocation();
  }, []);

  const loadUserData = async () => {
    const authData = await AuthService.getAuthData();
    if (authData) setUserId(authData.userId);
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => console.log('Location error:', err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Info', 'Please describe the waterlogging situation');
      return;
    }
    setLoading(true);
    try {
      await ReportService.submitReport({
        latitude: location.latitude,
        longitude: location.longitude,
        severity,
        description,
        userId,
      });
      const isOffline = await AuthService.isOfflineMode();
      Alert.alert(
        'Report Submitted',
        isOffline
          ? 'Saved locally. It will sync when you are back online.'
          : 'Thank you for reporting!',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Location card */}
        <View style={styles.locationCard}>
          <Text style={styles.locationEmoji}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Your Location</Text>
            <Text style={styles.locationCoords}>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
          </View>
          <TouchableOpacity onPress={getCurrentLocation} style={styles.relocateBtn}>
            <Text style={styles.relocateText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Severity */}
        <Text style={styles.sectionTitle}>Severity Level</Text>
        <View style={styles.severityRow}>
          {SEVERITY_OPTIONS.map(opt => {
            const active = severity === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.severityCard,
                  active && { borderColor: opt.color, backgroundColor: opt.color + '10' },
                ]}
                onPress={() => setSeverity(opt.key)}
                disabled={loading}
                activeOpacity={0.7}>
                <Text style={styles.severityEmoji}>{opt.emoji}</Text>
                <Text style={[styles.severityLabel, active && { color: opt.color }]}>{opt.label}</Text>
                <Text style={styles.severityDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What does the waterlogging look like? How deep is it? Is the road blocked?"
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          editable={!loading}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 20, paddingBottom: 40 },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  locationEmoji: { fontSize: 24, marginRight: 12 },
  locationLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
  locationCoords: { fontSize: 12, color: '#6366F1', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  relocateBtn: { padding: 8 },
  relocateText: { fontSize: 18 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },

  severityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  severityCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  severityEmoji: { fontSize: 22, marginBottom: 6 },
  severityLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 2 },
  severityDesc: { fontSize: 11, color: '#9CA3AF' },

  textArea: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    lineHeight: 22,
  },

  submitBtn: {
    backgroundColor: '#6366F1',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitBtnDisabled: { backgroundColor: '#C7D2FE' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});

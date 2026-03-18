import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/AuthService';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
];

type Step = 'details' | 'otp';

export const LoginScreen = ({ navigation }: any) => {
  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fullPhone = `${selectedCountry.code}${phone}`;

  const handleSendOTP = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name');
      return;
    }
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const result = await AuthService.requestOTP(fullPhone, fullName.trim(), email.trim() || undefined);
      if (result.message?.includes('Offline')) {
        Alert.alert('Offline Mode', 'Server unavailable. Entering offline mode.', [
          { text: 'OK', onPress: () => navigation.replace('Home') },
        ]);
      } else {
        Alert.alert('OTP Sent', `A verification code has been sent to ${fullPhone}`);
        setStep('otp');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }
    setLoading(true);
    try {
      await AuthService.verifyOTP(fullPhone, otp);
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert('Skip Login', 'Reports will only be stored locally on your device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => navigation.replace('Home') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🌊</Text>
            </View>
            <Text style={styles.title}>CIVIX</Text>
            <Text style={styles.tagline}>Waterlogging Alert System</Text>
          </View>

          {step === 'details' ? (
            <>
              <Text style={styles.sectionLabel}>Create your account</Text>

              {/* Full Name */}
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#9CA3AF"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                  autoCapitalize="words"
                />
              </View>

              {/* Email */}
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Phone */}
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={styles.countryBtn}
                  onPress={() => setShowPicker(true)}
                  disabled={loading}
                  activeOpacity={0.7}>
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                  <Text style={styles.countryArrow}>▾</Text>
                </TouchableOpacity>
                <View style={styles.phoneInputWrap}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={t => setPhone(t.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={12}
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Get OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Verify your number</Text>
              <Text style={styles.otpHint}>Enter the 6-digit code sent to {fullPhone}</Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#9CA3AF"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpLinks}>
                <TouchableOpacity onPress={() => { setStep('details'); setOtp(''); }} disabled={loading}>
                  <Text style={styles.linkText}>← Change details</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOTP} disabled={loading}>
                  <Text style={styles.linkText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Works offline · Reports sync automatically</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country code picker modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Country</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={i => i.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item.code === selectedCountry.code && styles.pickerItemActive]}
                  onPress={() => { setSelectedCountry(item); setShowPicker(false); }}
                  activeOpacity={0.6}>
                  <Text style={styles.pickerFlag}>{item.flag}</Text>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerCode}>{item.code}</Text>
                  {item.code === selectedCountry.code && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#1F2937', letterSpacing: 1 },
  tagline: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 16 },
  otpHint: { fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, height: 54, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1F2937', paddingVertical: 0 },

  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  countryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 12, height: 54, borderWidth: 1, borderColor: '#E5E7EB', gap: 6,
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  countryArrow: { fontSize: 12, color: '#9CA3AF' },
  phoneInputWrap: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, height: 54, borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  phoneInput: { fontSize: 15, color: '#1F2937', paddingVertical: 0 },

  btn: {
    backgroundColor: '#6366F1', height: 54, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', marginTop: 8, elevation: 4,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  btnDisabled: { backgroundColor: '#C7D2FE' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  otpLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  linkText: { color: '#6366F1', fontSize: 13, fontWeight: '500' },

  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  skipText: { color: '#9CA3AF', fontSize: 14 },

  footer: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, marginTop: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%', paddingBottom: 30,
  },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
    alignSelf: 'center', marginTop: 10, marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 16, fontWeight: '700', color: '#1F2937', textAlign: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6', gap: 12,
  },
  pickerItemActive: { backgroundColor: '#EEF2FF' },
  pickerFlag: { fontSize: 22 },
  pickerName: { flex: 1, fontSize: 15, color: '#1F2937' },
  pickerCode: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  pickerCheck: { fontSize: 16, color: '#6366F1', fontWeight: '700' },
});

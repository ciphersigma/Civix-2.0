import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/AuthService';

type Mode = 'login' | 'signup';
type Step = 'form' | 'otp';

export const LoginScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (m: Mode) => { setMode(m); setStep('form'); setOtp(''); };

  const handleSendOTP = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address'); return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name'); return;
    }
    setLoading(true);
    try {
      mode === 'signup' ? await AuthService.register(trimmed, fullName.trim()) : await AuthService.login(trimmed);
      Alert.alert('Code Sent', `A verification code has been sent to ${trimmed}`);
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) { Alert.alert('Invalid Code', 'Please enter the 6-digit code'); return; }
    setLoading(true);
    try {
      await AuthService.verifyOTP(email.trim().toLowerCase(), otp, mode === 'signup' ? fullName.trim() : undefined);
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.response?.data?.message || error.message || 'Invalid code');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoWrap}>
            <View style={s.logoCircle}><Text style={s.logoEmoji}>🌊</Text></View>
            <Text style={s.title}>CIVIX</Text>
            <Text style={s.tagline}>Waterlogging Alert System</Text>
          </View>

          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tab, mode === 'login' && s.tabActive]} onPress={() => switchMode('login')}>
              <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, mode === 'signup' && s.tabActive]} onPress={() => switchMode('signup')}>
              <Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {step === 'form' ? (
            <>
              {mode === 'signup' && (
                <View style={s.inputWrap}>
                  <Text style={s.inputIcon}>👤</Text>
                  <TextInput style={s.input} placeholder="Full Name" placeholderTextColor="#94A3B8" value={fullName} onChangeText={setFullName} editable={!loading} autoCapitalize="words" />
                </View>
              )}
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>✉️</Text>
                <TextInput style={s.input} placeholder="Email address" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
              </View>
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSendOTP} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Get Verification Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.otpHint}>Enter the 6-digit code sent to {email.trim()}</Text>
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>🔑</Text>
                <TextInput style={s.input} placeholder="Enter 6-digit code" placeholderTextColor="#94A3B8" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} editable={!loading} autoFocus />
              </View>
              <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleVerifyOTP} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify & Continue</Text>}
              </TouchableOpacity>
              <View style={s.otpLinks}>
                <TouchableOpacity onPress={() => { setStep('form'); setOtp(''); }} disabled={loading}><Text style={s.linkText}>← Back</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSendOTP} disabled={loading}><Text style={s.linkText}>Resend Code</Text></TouchableOpacity>
              </View>
            </>
          )}
          <Text style={s.footer}>Works offline · Reports sync automatically</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#C7D2FE' },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', letterSpacing: 1 },
  tagline: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#6366F1' },
  otpHint: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 54, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1E293B', paddingVertical: 0 },
  btn: { backgroundColor: '#6366F1', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, elevation: 3, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 },
  btnDisabled: { backgroundColor: '#A5B4FC' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  otpLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  linkText: { color: '#6366F1', fontSize: 13, fontWeight: '500' },
  footer: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 20 },
});

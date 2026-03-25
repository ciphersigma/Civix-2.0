import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../services/AuthService';
import { Theme as T } from '../components/ui';

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
      <StatusBar backgroundColor={T.bg} barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoArea}>
            <Image source={require('../assets/logo.png')} style={{ width: 64, height: 64, marginBottom: 20 }} resizeMode="contain" />
            <Text style={s.title}>Welcome to Civix</Text>
            <Text style={s.subtitle}>Sign in to access safer routes</Text>
          </View>

          {/* Tab switcher */}
          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tab, mode === 'login' && s.tabOn]} onPress={() => switchMode('login')}>
              <Text style={[s.tabTxt, mode === 'login' && s.tabTxtOn]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, mode === 'signup' && s.tabOn]} onPress={() => switchMode('signup')}>
              <Text style={[s.tabTxt, mode === 'signup' && s.tabTxtOn]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {step === 'form' ? (
            <View style={s.formArea}>
              {mode === 'signup' && (
                <>
                  <Text style={s.label}>Full Name</Text>
                  <View style={s.inputWrap}>
                    <TextInput style={s.input} placeholder="Your name" placeholderTextColor={T.textMuted} value={fullName} onChangeText={setFullName} editable={!loading} autoCapitalize="words" />
                  </View>
                </>
              )}
              <Text style={s.label}>Email Address</Text>
              <View style={s.inputWrap}>
                <TextInput style={s.input} placeholder="your.email@example.com" placeholderTextColor={T.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
              </View>
              <Text style={s.hint}>We'll send you a one-time code to verify your email</Text>
            </View>
          ) : (
            <View style={s.formArea}>
              <Text style={s.label}>Verification Code</Text>
              <Text style={s.otpHint}>Enter the 6-digit code sent to {email.trim()}</Text>
              <View style={s.inputWrap}>
                <TextInput style={[s.input, { textAlign: 'center', fontSize: 22, letterSpacing: 8 }]} placeholder="000000" placeholderTextColor={T.textMuted} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} editable={!loading} autoFocus />
              </View>
              <View style={s.otpLinks}>
                <TouchableOpacity onPress={() => { setStep('form'); setOtp(''); }} disabled={loading}><Text style={s.link}>← Back</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSendOTP} disabled={loading}><Text style={s.link}>Resend Code</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {/* Spacer pushes button to bottom */}
          <View style={{ flex: 1 }} />

          {/* CTA */}
          <TouchableOpacity
            style={[s.cta, loading && { opacity: 0.6 }]}
            onPress={step === 'form' ? handleSendOTP : handleVerifyOTP}
            disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={s.ctaText}>{step === 'form' ? 'Continue' : 'Verify & Continue'}</Text>
            )}
          </TouchableOpacity>

          <Text style={s.terms}>By continuing, you agree to our Terms of Service and{'\n'}Privacy Policy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },

  logoArea: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: T.textMuted, marginTop: 8 },

  tabRow: { flexDirection: 'row', backgroundColor: T.borderLight, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: T.card, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  tabTxt: { fontSize: 14, fontWeight: '600', color: T.textMuted },
  tabTxtOn: { color: T.primary },

  formArea: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 8 },
  inputWrap: { backgroundColor: T.card, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, height: 48, justifyContent: 'center', marginBottom: 16 },
  input: { fontSize: 15, color: T.text, paddingVertical: 0 },
  hint: { fontSize: 13, color: T.textMuted, marginTop: 0 },
  otpHint: { fontSize: 13, color: T.textSec, marginBottom: 16 },
  otpLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  link: { color: T.primary, fontSize: 13, fontWeight: '600' },

  cta: { backgroundColor: T.primary, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  terms: { textAlign: 'center', fontSize: 12, color: T.textMuted, lineHeight: 18 },
});

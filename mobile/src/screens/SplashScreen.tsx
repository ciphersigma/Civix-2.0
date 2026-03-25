import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { AuthService } from '../services/AuthService';

const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#94A3B8';

export const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    const t = setTimeout(async () => {
      const auth = await AuthService.isAuthenticated();
      navigation.replace(auth ? 'Home' : 'Login');
    }, 2000);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={s.center}>
        <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.name}>Civix</Text>
        <Text style={s.tag}>Safer routes, smarter travel</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center' },
  logo: { width: 80, height: 80, marginBottom: 24 },
  name: { fontSize: 32, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  tag: { fontSize: 15, color: MUTED, marginTop: 8 },
});

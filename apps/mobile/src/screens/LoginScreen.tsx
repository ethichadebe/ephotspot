import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { apiFetch, saveToken } from '../services/api';
import { registerWifiSuggestion, EPHOTSPOT_SSID } from '../services/wifi';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    if (!phone.trim()) { Alert.alert('Error', 'Enter your phone number'); return; }
    setLoading(true);
    try {
      await apiFetch('/auth/phone/request', { method: 'POST', body: JSON.stringify({ phone: phone.trim() }) });
      setStep('otp');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otp.trim()) { Alert.alert('Error', 'Enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: { id: string } }>(
        '/auth/phone/verify', { method: 'POST', body: JSON.stringify({ phone: phone.trim(), code: otp.trim() }) }
      );
      await saveToken(res.token);
      // Register WiFi suggestion after successful auth
      await registerWifiSuggestion(EPHOTSPOT_SSID);
      navigation.replace('Home');
    } catch (err: unknown) {
      Alert.alert('Invalid OTP', err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>EPHotspot</Text>
        <Text style={styles.subtitle}>Connect anywhere, anytime</Text>

        {step === 'phone' ? (
          <>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input} value={phone} onChangeText={setPhone}
              placeholder="+27 82 123 4567" keyboardType="phone-pad" autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={requestOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter the code sent to {phone}</Text>
            <TextInput
              style={styles.input} value={otp} onChangeText={setOtp}
              placeholder="123456" keyboardType="number-pad" maxLength={6} autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={verifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => setStep('phone')}>
              <Text style={styles.linkText}>Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#1e40af', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16,
  },
  btn: {
    backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#1d4ed8', fontSize: 14 },
});

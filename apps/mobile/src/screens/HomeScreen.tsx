import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, AppState, ActivityIndicator,
} from 'react-native';
import { apiFetch, clearToken } from '../services/api';
import { removeWifiSuggestion } from '../services/wifi';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

interface Balance {
  remainingMb: number;
  rolledOverMb: number;
  lastPackageId: string | null;
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${Math.round(mb)} MB`;
}

function BalanceArc({ pct }: { pct: number }) {
  const color = pct > 0.2 ? '#22c55e' : pct > 0.1 ? '#f59e0b' : '#ef4444';
  return (
    <View style={styles.arcContainer}>
      <View style={[styles.arcFill, { backgroundColor: color, width: `${Math.max(2, pct * 100)}%` }]} />
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    try {
      const data = await apiFetch<Balance>('/user/balance');
      setBalance(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadBalance();
    });
    return () => sub.remove();
  }, [loadBalance]);

  async function handleLogout() {
    await clearToken();
    await removeWifiSuggestion('EPHotspot-Secure');
    navigation.replace('Login');
  }

  const remainingMb = balance ? Number(balance.remainingMb) : 0;
  const lastPkg = balance?.lastPackageId ? 1024 : 1024; // fallback package size
  const pct = Math.min(1, remainingMb / lastPkg);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EPHotspot</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color="#1d4ed8" size="large" />
        ) : remainingMb <= 0 ? (
          <>
            <Text style={styles.exhausted}>No data remaining</Text>
            <Text style={styles.exhaustedSub}>Buy a package to reconnect</Text>
          </>
        ) : (
          <>
            <Text style={styles.balanceLabel}>Data remaining</Text>
            <Text style={styles.balance}>{formatMb(remainingMb)}</Text>
            <BalanceArc pct={pct} />
            <Text style={styles.pctText}>{Math.round(pct * 100)}% remaining</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.topUpBtn} onPress={() => navigation.navigate('Packages')}>
        <Text style={styles.topUpText}>Top up data</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyLink} onPress={() => navigation.navigate('History')}>
        <Text style={styles.historyText}>Transaction history</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, marginTop: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e40af' },
  logout: { color: '#94a3b8', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 32,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 12, elevation: 3, marginBottom: 24,
  },
  balanceLabel: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  balance: { fontSize: 48, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  arcContainer: { width: '100%', height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  arcFill: { height: '100%', borderRadius: 6 },
  pctText: { marginTop: 10, color: '#64748b', fontSize: 14 },
  exhausted: { fontSize: 22, fontWeight: '700', color: '#ef4444' },
  exhaustedSub: { color: '#94a3b8', marginTop: 8 },
  topUpBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginBottom: 16,
  },
  topUpText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  historyLink: { alignItems: 'center' },
  historyText: { color: '#1d4ed8', fontSize: 14 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { apiFetch } from '../services/api';

interface Purchase {
  id: string;
  createdAt: string;
  amountZar: string;
  paymentMethod: string;
  package: { name: string; dataMb: number };
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

export default function HistoryScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Purchase[]>('/user/purchases').then(setPurchases).finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      {purchases.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No purchases yet</Text>
          <Text style={styles.emptySub}>Your transactions will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.pkgName}>{item.package.name}</Text>
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleDateString()} · {item.paymentMethod === 'peach' ? 'Card/EFT' : 'Airtime'}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.amount}>R {parseFloat(item.amountZar).toFixed(2)}</Text>
                <Text style={styles.data}>+{formatMb(item.package.dataMb)}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#94a3b8' },
  emptySub: { color: '#cbd5e1', marginTop: 8 },
  row: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', elevation: 1,
  },
  rowLeft: { flex: 1 },
  pkgName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  rowRight: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  data: { fontSize: 12, color: '#22c55e', marginTop: 4 },
});

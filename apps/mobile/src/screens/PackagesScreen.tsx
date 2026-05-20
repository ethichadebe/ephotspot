import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { apiFetch } from '../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Packages'> };

interface DataPackage {
  id: string;
  name: string;
  dataMb: number;
  priceZar: string;
}

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

export default function PackagesScreen({ navigation }: Props) {
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DataPackage | null>(null);
  const [paying, setPaying] = useState(false);
  const [methodModal, setMethodModal] = useState(false);

  useEffect(() => {
    apiFetch<DataPackage[]>('/packages').then(setPackages).finally(() => setLoading(false));
  }, []);

  async function pay(method: 'peach' | 'bango') {
    if (!selected) return;
    setPaying(true);
    setMethodModal(false);
    try {
      if (method === 'peach') {
        const { checkoutUrl } = await apiFetch<{ checkoutUrl: string }>(
          '/payments/peach/initiate', { method: 'POST', body: JSON.stringify({ packageId: selected.id }) }
        );
        // In production: open WebView or Linking.openURL(checkoutUrl)
        Alert.alert('Checkout', `Open payment URL:\n${checkoutUrl}`, [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
      } else {
        const { chargeId } = await apiFetch<{ chargeId: string }>(
          '/payments/bango/initiate', { method: 'POST', body: JSON.stringify({ packageId: selected.id, phone: '' }) }
        );
        Alert.alert('Airtime payment', `Charge initiated: ${chargeId}`, [
          { text: 'Done', onPress: () => navigation.navigate('Home') },
        ]);
      }
    } catch (err: unknown) {
      Alert.alert('Payment failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a package</Text>
      <FlatList
        data={packages}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, selected?.id === item.id && styles.cardSelected]}
            onPress={() => setSelected(item)}
          >
            <View>
              <Text style={styles.pkgName}>{item.name}</Text>
              <Text style={styles.pkgData}>{formatMb(item.dataMb)}</Text>
            </View>
            <Text style={styles.pkgPrice}>R {parseFloat(item.priceZar).toFixed(2)}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {selected && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.buyBtn} onPress={() => setMethodModal(true)} disabled={paying}>
            {paying
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buyText}>Buy {selected.name} — R {parseFloat(selected.priceZar).toFixed(2)}</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={methodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose payment method</Text>
            <TouchableOpacity style={styles.methodBtn} onPress={() => pay('peach')}>
              <Text style={styles.methodBtnText}>Card / EFT (Peach Payments)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.methodBtn, styles.methodBtnAlt]} onPress={() => pay('bango')}>
              <Text style={styles.methodBtnText}>Airtime (Bango)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMethodModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent', elevation: 2,
  },
  cardSelected: { borderColor: '#1d4ed8' },
  pkgName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  pkgData: { fontSize: 14, color: '#64748b', marginTop: 2 },
  pkgPrice: { fontSize: 20, fontWeight: '800', color: '#1d4ed8' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#f8fafc' },
  buyBtn: { backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  buyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20, color: '#1e293b' },
  methodBtn: { backgroundColor: '#1d4ed8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  methodBtnAlt: { backgroundColor: '#0f766e' },
  methodBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#94a3b8', fontSize: 15 },
});

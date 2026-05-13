import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import api from '../../src/api/client';

export default function AlertasScreen() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [resolviendo, setResolviendo] = useState<number | null>(null);

  const cargar = async () => {
    try {
      const { data } = await api.get('/iot/alertas/activas');
      setAlertas(data.data);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron cargar las alertas');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const resolver = async (id: number) => {
    Alert.alert('¿Resolver alerta?', 'Confirma que el problema fue solucionado.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resolver',
        onPress: async () => {
          setResolviendo(id);
          try {
            await api.post(`/iot/alerta/${id}/resolver`);
            setAlertas((prev) => prev.filter((a) => a.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'No se pudo resolver');
          } finally {
            setResolviendo(null);
          }
        },
      },
    ]);
  };

  if (cargando) return <View style={s.centrado}><ActivityIndicator size="large" color="#1E3A8A" /></View>;

  return (
    <View style={s.container}>
      {alertas.length > 0 && (
        <View style={s.banner}>
          <Text style={s.bannerTxt}>⚠️ {alertas.length} alerta{alertas.length > 1 ? 's' : ''} activa{alertas.length > 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlatList
        data={alertas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Text style={s.vacioIcono}>✅</Text>
            <Text style={s.vacioTxt}>Sin alertas activas</Text>
            <Text style={s.vacioSub}>Todos los plotters operan normalmente</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.card, item.tipo === 'atasco' ? s.cardRojo : s.cardAmarillo]}>
            <View style={s.cardHeader}>
              <Text style={s.icono}>{item.tipo === 'atasco' ? '🔴' : '🟡'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.plotter}>{item.plotter_modelo}</Text>
                <Text style={s.ubicacion}>📍 {item.plotter_ubicacion}</Text>
              </View>
              <View style={[s.tipoBadge, item.tipo === 'atasco' ? s.tipoRojo : s.tipoAmarillo]}>
                <Text style={s.tipoBadgeTxt}>{item.tipo.replace('_', ' ')}</Text>
              </View>
            </View>

            <Text style={s.descripcion}>{item.descripcion}</Text>

            {item.porcentaje_avance !== null && (
              <Text style={s.porcentaje}>Nivel de tinta: {item.porcentaje_avance}%</Text>
            )}

            <Text style={s.tiempo}>
              🕐 {new Date(item.timestamp).toLocaleString('es-CL')}
            </Text>

            <TouchableOpacity
              style={[s.btnResolver, resolviendo === item.id && s.btnDisabled]}
              onPress={() => resolver(item.id)}
              disabled={resolviendo === item.id}
            >
              {resolviendo === item.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.btnTxt}>✓ Marcar como resuelto</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  centrado:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner:     { backgroundColor: '#FEF2F2', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: '#FECACA' },
  bannerTxt:  { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  card:       { borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4 },
  cardRojo:   { backgroundColor: '#FFF5F5', borderLeftColor: '#EF4444' },
  cardAmarillo: { backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  icono:      { fontSize: 20, marginTop: 2 },
  plotter:    { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  ubicacion:  { fontSize: 12, color: '#64748B', marginTop: 2 },
  tipoBadge:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tipoRojo:   { backgroundColor: '#FEE2E2' },
  tipoAmarillo: { backgroundColor: '#FEF3C7' },
  tipoBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  descripcion:{ fontSize: 13, color: '#475569', marginBottom: 4 },
  porcentaje: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  tiempo:     { fontSize: 11, color: '#94A3B8', marginBottom: 10 },
  btnResolver:{ backgroundColor: '#1E3A8A', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnDisabled:{ opacity: 0.5 },
  btnTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  vacio:      { alignItems: 'center', marginTop: 80 },
  vacioIcono: { fontSize: 48, marginBottom: 12 },
  vacioTxt:   { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  vacioSub:   { fontSize: 13, color: '#64748B' },
});

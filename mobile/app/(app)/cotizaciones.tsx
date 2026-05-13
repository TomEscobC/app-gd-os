import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import api from '../../src/api/client';

const ESTADOS = ['todas', 'pendiente', 'aprobada', 'rechazada'] as const;
type Estado = typeof ESTADOS[number];

export default function CotizacionesScreen() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<Estado>('todas');
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);

  const cargar = async (estado?: string) => {
    try {
      const params: any = { fecha: 'hoy' };
      if (estado && estado !== 'todas') params.estado = estado;
      const { data } = await api.get('/cotizacion', { params });
      setCotizaciones(data.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Error al cargar');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => { cargar(filtro); }, [filtro]);

  const cambiarEstado = async (id: number, accion: 'aprobar' | 'rechazar') => {
    setAccionando(id);
    try {
      await api.post(`/cotizacion/${id}/${accion}`);
      await cargar(filtro);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo actualizar');
    } finally {
      setAccionando(null);
    }
  };

  const confirmar = (id: number, accion: 'aprobar' | 'rechazar') => {
    Alert.alert(
      accion === 'aprobar' ? '¿Aprobar cotización?' : '¿Rechazar cotización?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: accion === 'aprobar' ? 'Aprobar' : 'Rechazar',
          style: accion === 'rechazar' ? 'destructive' : 'default',
          onPress: () => cambiarEstado(id, accion) },
      ]
    );
  };

  if (cargando) return <View style={s.centrado}><ActivityIndicator size="large" color={AZUL} /></View>;

  return (
    <View style={s.container}>
      {/* Filtros */}
      <View style={s.filtros}>
        {ESTADOS.map((e) => (
          <TouchableOpacity
            key={e}
            style={[s.filtroBtn, filtro === e && s.filtroBtnActivo]}
            onPress={() => setFiltro(e)}
          >
            <Text style={[s.filtroTxt, filtro === e && s.filtroTxtActivo]}>
              {e.charAt(0).toUpperCase() + e.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={cotizaciones}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(filtro); }} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Text style={s.vacio}>No hay cotizaciones</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.cliente}>{item.cliente_nombre}</Text>
                <Text style={s.telefono}>📞 {item.cliente_telefono || '—'}</Text>
              </View>
              <EstadoBadge estado={item.estado} />
            </View>

            <Text style={s.total}>💰 ${Number(item.total).toLocaleString('es-CL')}</Text>
            <Text style={s.fecha}>🕐 {new Date(item.fecha).toLocaleString('es-CL')}</Text>

            {/* Items */}
            {item.items_detalle?.map((it: any, idx: number) => (
              <Text key={idx} style={s.item}>• {it.descripcion}: ${Number(it.precio).toLocaleString('es-CL')}</Text>
            ))}

            {/* Acciones solo si está pendiente */}
            {item.estado === 'pendiente' && (
              <View style={s.acciones}>
                <TouchableOpacity
                  style={[s.btnAprobar, accionando === item.id && s.btnDisabled]}
                  onPress={() => confirmar(item.id, 'aprobar')}
                  disabled={accionando === item.id}
                >
                  {accionando === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.btnTxt}>✅ Aprobar</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnRechazar, accionando === item.id && s.btnDisabled]}
                  onPress={() => confirmar(item.id, 'rechazar')}
                  disabled={accionando === item.id}
                >
                  <Text style={s.btnTxt}>❌ Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colores: Record<string, string> = { pendiente: '#F59E0B', aprobada: '#10B981', rechazada: '#EF4444' };
  return (
    <View style={[s.badge, { backgroundColor: colores[estado] || '#94A3B8' }]}>
      <Text style={s.badgeTxt}>{estado}</Text>
    </View>
  );
}

const AZUL = '#1E3A8A';
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  centrado:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filtros:    { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  filtroBtn:  { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  filtroBtnActivo: { backgroundColor: AZUL },
  filtroTxt:  { fontSize: 11, fontWeight: '600', color: '#64748B' },
  filtroTxtActivo: { color: '#fff' },
  card:       { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cliente:    { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  telefono:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  total:      { fontSize: 14, fontWeight: '600', color: AZUL, marginBottom: 2 },
  fecha:      { fontSize: 11, color: '#94A3B8', marginBottom: 6 },
  item:       { fontSize: 12, color: '#475569', marginLeft: 4 },
  acciones:   { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnAprobar: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnRechazar:{ flex: 1, backgroundColor: '#EF4444', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnDisabled:{ opacity: 0.5 },
  btnTxt:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  vacio:      { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14 },
});

import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth.store';

interface Instalacion {
  id: number;
  estado: string;
  cliente_nombre: string;
  cliente_telefono: string;
  total: number;
  items_detalle: any[];
}

export default function RutaScreen() {
  const { usuario } = useAuthStore();
  const router      = useRouter();

  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [cargando,      setCargando]      = useState(true);
  const [refrescando,   setRefrescando]   = useState(false);

  const cargar = async () => {
    if (!usuario) return;
    try {
      const { data } = await api.get(`/instalador/${usuario.id}/ruta`);
      setInstalaciones(data.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo cargar la ruta');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const onRefresh = () => { setRefrescando(true); cargar(); };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.saludo}>Hola, {usuario?.nombre} 👷</Text>
      <Text style={styles.subtitulo}>
        {instalaciones.length === 0
          ? 'Sin instalaciones para hoy'
          : `${instalaciones.length} instalación(es) hoy`}
      </Text>

      <FlatList
        data={instalaciones}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.estado === 'completada' && styles.cardCompletada]}
            onPress={() => {
              if (item.estado === 'completada') return;
              router.push({ pathname: '/(app)/completar', params: { id: item.id } });
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cliente}>{item.cliente_nombre}</Text>
              <EstadoBadge estado={item.estado} />
            </View>
            <Text style={styles.telefono}>📞 {item.cliente_telefono || '—'}</Text>
            <Text style={styles.total}>
              💰 ${Number(item.total).toLocaleString('es-CL')}
            </Text>
            {item.estado !== 'completada' && (
              <Text style={styles.accion}>Toca para marcar como completada →</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTxt}>No hay instalaciones asignadas para hoy.</Text>
          </View>
        }
      />
    </View>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colores: Record<string, string> = {
    pendiente:   '#F59E0B',
    en_progreso: '#3B82F6',
    completada:  '#10B981',
    cancelada:   '#EF4444',
  };
  return (
    <View style={[styles.badge, { backgroundColor: colores[estado] || '#94A3B8' }]}>
      <Text style={styles.badgeTxt}>{estado.replace('_', ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  centrado:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saludo:     { fontSize: 20, fontWeight: '700', color: '#1E3A8A', marginBottom: 4 },
  subtitulo:  { fontSize: 13, color: '#64748B', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardCompletada: { opacity: 0.6 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cliente:     { fontSize: 16, fontWeight: '600', color: '#1E293B', flex: 1 },
  telefono:    { fontSize: 13, color: '#64748B', marginBottom: 4 },
  total:       { fontSize: 14, fontWeight: '600', color: '#1E3A8A', marginBottom: 6 },
  accion:      { fontSize: 12, color: '#3B82F6', marginTop: 4 },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTxt:    { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  vacio:       { alignItems: 'center', marginTop: 60 },
  vacioTxt:    { color: '#94A3B8', fontSize: 15 },
});

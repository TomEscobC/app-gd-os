import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth.store';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface Resumen {
  cotizaciones: { aprobadas: string; pendientes: string; rechazadas: string; total: string; monto_aprobado: string };
  instaladores: any[];
  alertas: any[];
}

export default function DashboardScreen() {
  const { usuario } = useAuthStore();
  const router = useRouter();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const registrarPushToken = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await api.post('/auth/push-token', { push_token: token });
    } catch {}
  };

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/resumen');
      setResumen(data.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo cargar el dashboard');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    registrarPushToken();
    const intervalo = setInterval(cargar, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const onRefresh = () => { setRefrescando(true); cargar(); };

  if (cargando) return <View style={s.centrado}><ActivityIndicator size="large" color={AZUL} /></View>;

  const cot = resumen?.cotizaciones;

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} />}>

      <Text style={s.saludo}>Hola, {usuario?.nombre} 👋</Text>
      <Text style={s.fecha}>{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

      {/* Stats cotizaciones */}
      <Text style={s.seccion}>Cotizaciones de hoy</Text>
      <View style={s.statsGrid}>
        <StatCard valor={cot?.aprobadas || '0'} label="Aprobadas"  color="#10B981" />
        <StatCard valor={cot?.pendientes || '0'} label="Pendientes" color="#F59E0B" />
        <StatCard valor={cot?.rechazadas || '0'} label="Rechazadas" color="#EF4444" />
        <StatCard valor={`$${Number(cot?.monto_aprobado || 0).toLocaleString('es-CL')}`} label="Monto" color={AZUL} small />
      </View>

      {/* Accesos rápidos */}
      <Text style={s.seccion}>Accesos rápidos</Text>
      <View style={s.accesoGrid}>
        <AccesoBtn icono="📋" label="Cotizaciones" onPress={() => router.push('/(app)/cotizaciones' as any)} />
        <AccesoBtn icono="🗺️" label="Mapa"          onPress={() => router.push('/(app)/mapa' as any)} />
        <AccesoBtn icono="🚨" label={`Alertas${resumen?.alertas?.length ? ` (${resumen.alertas.length})` : ''}`}
          onPress={() => router.push('/(app)/alertas' as any)}
          urgente={!!resumen?.alertas?.length}
        />
      </View>

      {/* Alertas activas */}
      {!!resumen?.alertas?.length && (
        <>
          <Text style={s.seccion}>Alertas activas</Text>
          {resumen.alertas.slice(0, 3).map((a: any) => (
            <View key={a.id} style={s.alertaItem}>
              <Text style={s.alertaIcono}>{a.tipo === 'atasco' ? '🔴' : '🟡'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.alertaTitulo}>{a.plotter_modelo}</Text>
                <Text style={s.alertaDesc}>{a.descripcion}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(app)/alertas' as any)}>
                <Text style={s.verMas}>Ver →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Instaladores activos */}
      <Text style={s.seccion}>Instaladores activos hoy</Text>
      {resumen?.instaladores?.length === 0
        ? <Text style={s.vacio}>Sin instaladores activos</Text>
        : resumen?.instaladores?.map((i: any) => (
          <View key={i.id} style={s.instCard}>
            <Text style={s.instNombre}>👷 {i.nombre}</Text>
            <Text style={s.instSub}>{i.completadas_hoy}/{i.instalaciones_hoy} completadas</Text>
          </View>
        ))
      }

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({ valor, label, color, small }: { valor: string; label: string; color: string; small?: boolean }) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValor, { color, fontSize: small ? 14 : 26 }]}>{valor}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function AccesoBtn({ icono, label, onPress, urgente }: any) {
  return (
    <TouchableOpacity style={[s.accesoBtn, urgente && s.accesoBtnUrgente]} onPress={onPress}>
      <Text style={s.accesoIcono}>{icono}</Text>
      <Text style={[s.accesoLabel, urgente && { color: '#EF4444' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const AZUL = '#1E3A8A';

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  centrado:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saludo:     { fontSize: 20, fontWeight: '700', color: AZUL },
  fecha:      { fontSize: 13, color: '#64748B', marginBottom: 20, textTransform: 'capitalize' },
  seccion:    { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10, marginTop: 8 },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard:   { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statValor:  { fontWeight: '700', marginBottom: 4 },
  statLabel:  { fontSize: 11, color: '#64748B' },
  accesoGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  accesoBtn:  { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  accesoBtnUrgente: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  accesoIcono: { fontSize: 22, marginBottom: 4 },
  accesoLabel: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },
  alertaItem: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertaIcono: { fontSize: 20 },
  alertaTitulo: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  alertaDesc:  { fontSize: 11, color: '#64748B' },
  verMas:      { fontSize: 12, color: AZUL, fontWeight: '600' },
  instCard:    { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  instNombre:  { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  instSub:     { fontSize: 12, color: '#64748B' },
  vacio:       { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginVertical: 12 },
});

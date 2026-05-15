import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions, RefreshControl,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import api from '../../src/api/client';

const PERIODOS = ['hoy', 'semana', 'mes'] as const;
type Periodo = typeof PERIODOS[number];

const COLORES = {
  aprobada:  '#10B981',
  pendiente: '#F59E0B',
  rechazada: '#EF4444',
};

const ANCHO = Dimensions.get('window').width - 32;

export default function ReportesScreen() {
  const [periodo, setPeriodo]   = useState<Periodo>('hoy');
  const [data, setData]         = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = async (p: Periodo) => {
    try {
      const { data } = await api.get('/dashboard/reportes', { params: { periodo: p } });
      setData(data.data);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo cargar el reporte');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => { cargar(periodo); }, [periodo]);

  if (cargando) return <View style={s.centrado}><ActivityIndicator size="large" color="#1E3A8A" /></View>;

  const pieData = (data?.cotizaciones_por_estado || []).map((c: any) => ({
    name:            c.estado,
    population:      c.total,
    color:           COLORES[c.estado as keyof typeof COLORES] || '#94A3B8',
    legendFontColor: '#334155',
    legendFontSize:  12,
  }));

  const serie = data?.serie_diaria || [];
  const barData = {
    labels: serie.map((d: any) =>
      new Date(d.dia).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
    ),
    datasets: [{ data: serie.map((d: any) => d.total) }],
  };

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(periodo); }} />}
    >
      {/* Selector de periodo */}
      <View style={s.tabs}>
        {PERIODOS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.tab, periodo === p && s.tabActivo]}
            onPress={() => setPeriodo(p)}
          >
            <Text style={[s.tabTxt, periodo === p && s.tabTxtActivo]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs */}
      <View style={s.kpis}>
        <Kpi
          valor={`$${Number(data?.total_facturado || 0).toLocaleString('es-CL')}`}
          label="Facturado"
          color="#1E3A8A"
        />
        <Kpi
          valor={`${(data?.horas_promedio_instalacion || 0).toFixed(1)}h`}
          label="Tiempo prom. instalación"
          color="#10B981"
        />
      </View>

      {/* Pie de cotizaciones */}
      {pieData.length > 0 && (
        <View style={s.cardChart}>
          <Text style={s.titulo}>Cotizaciones por estado</Text>
          <PieChart
            data={pieData}
            width={ANCHO}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        </View>
      )}

      {/* Barras serie diaria */}
      {serie.length > 1 && (
        <View style={s.cardChart}>
          <Text style={s.titulo}>Cotizaciones por día</Text>
          <BarChart
            data={barData}
            width={ANCHO}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            fromZero
            showValuesOnTopOfBars
            style={{ borderRadius: 8 }}
          />
        </View>
      )}

      {/* Top instaladores */}
      <View style={s.card}>
        <Text style={s.titulo}>🏆 Top instaladores</Text>
        {(data?.top_instaladores || []).map((i: any, idx: number) => (
          <View key={i.id} style={s.fila}>
            <Text style={s.medalla}>{['🥇', '🥈', '🥉', '4.', '5.'][idx]}</Text>
            <Text style={s.filaNombre}>{i.nombre}</Text>
            <Text style={s.filaValor}>{i.completadas}/{i.total}</Text>
          </View>
        ))}
        {(!data?.top_instaladores || data.top_instaladores.length === 0) && (
          <Text style={s.vacio}>Sin instalaciones en el periodo</Text>
        )}
      </View>

      {/* Alertas por plotter */}
      <View style={s.card}>
        <Text style={s.titulo}>🖨 Alertas por plotter</Text>
        {(data?.alertas_por_plotter || []).map((p: any) => (
          <View key={p.id} style={s.fila}>
            <View style={{ flex: 1 }}>
              <Text style={s.filaNombre}>{p.modelo}</Text>
              <Text style={s.filaSub}>📍 {p.ubicacion}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.filaValor}>{p.total}</Text>
              <Text style={s.filaSub}>{p.resueltas} resueltas · {p.pendientes} pend.</Text>
            </View>
          </View>
        ))}
        {(!data?.alertas_por_plotter || data.alertas_por_plotter.length === 0) && (
          <Text style={s.vacio}>Sin alertas en el periodo</Text>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Kpi({ valor, label, color }: { valor: string; label: string; color: string }) {
  return (
    <View style={s.kpiCard}>
      <Text style={[s.kpiValor, { color }]}>{valor}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo:   '#fff',
  decimalPlaces: 0,
  color:          (o = 1) => `rgba(30, 58, 138, ${o})`,
  labelColor:     (o = 1) => `rgba(51, 65, 85, ${o})`,
  barPercentage:  0.6,
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  centrado:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs:      { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 4, marginBottom: 14 },
  tab:       { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActivo: { backgroundColor: '#1E3A8A' },
  tabTxt:    { color: '#64748B', fontWeight: '600', fontSize: 13 },
  tabTxtActivo: { color: '#fff' },
  kpis:      { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2 },
  kpiValor:  { fontSize: 18, fontWeight: '700' },
  kpiLabel:  { fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'center' },
  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2 },
  cardChart: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 14, elevation: 2, alignItems: 'center' },
  titulo:    { fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 10 },
  fila:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  medalla:   { width: 32, fontSize: 16 },
  filaNombre:{ flex: 1, fontSize: 13, color: '#1E293B', fontWeight: '600' },
  filaSub:   { fontSize: 11, color: '#64748B' },
  filaValor: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  vacio:     { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
});

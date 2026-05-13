import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import api from '../../src/api/client';

export default function MapaScreen() {
  const [instaladores, setInstaladores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      const { data } = await api.get('/dashboard/resumen');
      const conUbicacion = (data.data.instaladores || []).filter(
        (i: any) => i.ultima_latitud && i.ultima_longitud
      );
      setInstaladores(conUbicacion);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cargar el mapa');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 30000);
    return () => clearInterval(intervalo);
  }, []);

  if (cargando) return <View style={s.centrado}><ActivityIndicator size="large" color="#1E3A8A" /></View>;

  const region = instaladores.length > 0
    ? {
        latitude:       Number(instaladores[0].ultima_latitud),
        longitude:      Number(instaladores[0].ultima_longitud),
        latitudeDelta:  0.05,
        longitudeDelta: 0.05,
      }
    : { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <View style={s.container}>
      <MapView style={s.mapa} initialRegion={region} showsUserLocation>
        {instaladores.map((inst) => (
          <Marker
            key={inst.id}
            coordinate={{
              latitude:  Number(inst.ultima_latitud),
              longitude: Number(inst.ultima_longitud),
            }}
            title={inst.nombre}
            pinColor="#1E3A8A"
          >
            <Callout>
              <View style={s.callout}>
                <Text style={s.calloutNombre}>👷 {inst.nombre}</Text>
                <Text style={s.calloutSub}>
                  {inst.completadas_hoy}/{inst.instalaciones_hoy} completadas hoy
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Leyenda */}
      <View style={s.leyenda}>
        <Text style={s.leyendaTitulo}>Instaladores activos: {instaladores.length}</Text>
        <TouchableOpacity onPress={cargar}>
          <Text style={s.actualizar}>↻ Actualizar</Text>
        </TouchableOpacity>
      </View>

      {instaladores.length === 0 && (
        <View style={s.sinDatos}>
          <Text style={s.sinDatosTxt}>Sin instaladores con ubicación registrada hoy</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centrado:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapa:      { flex: 1 },
  callout:   { padding: 8, minWidth: 160 },
  calloutNombre: { fontWeight: '700', fontSize: 13, color: '#1E293B' },
  calloutSub:    { fontSize: 11, color: '#64748B', marginTop: 2 },
  leyenda: {
    position: 'absolute', top: 16, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 10, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  leyendaTitulo: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  actualizar:    { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  sinDatos: {
    position: 'absolute', bottom: 32, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  sinDatosTxt: { color: '#94A3B8', fontSize: 13 },
});

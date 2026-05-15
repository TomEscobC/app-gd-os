import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
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

  const generarHTML = (instaladores: any[]) => {
    const centro = instaladores.length > 0
      ? [Number(instaladores[0].ultima_latitud), Number(instaladores[0].ultima_longitud)]
      : [-33.4489, -70.6693];

    const marcadores = instaladores.map((inst) => `
      L.marker([${inst.ultima_latitud}, ${inst.ultima_longitud}])
        .addTo(map)
        .bindPopup('<b>👷 ${inst.nombre}</b><br>${inst.completadas_hoy || 0}/${inst.instalaciones_hoy || 0} completadas hoy')
        .openPopup();
    `).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${centro[0]}, ${centro[1]}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);
    ${marcadores}
  </script>
</body>
</html>`;
  };

  if (cargando) {
    return <View style={s.centrado}><ActivityIndicator size="large" color="#1E3A8A" /></View>;
  }

  return (
    <View style={s.container}>
      {/* Leyenda superior */}
      <View style={s.leyenda}>
        <Text style={s.leyendaTitulo}>👷 Instaladores activos: {instaladores.length}</Text>
        <TouchableOpacity onPress={cargar}>
          <Text style={s.actualizar}>↻ Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      <WebView
        source={{ html: generarHTML(instaladores) }}
        style={s.mapa}
        originWhitelist={['*']}
        javaScriptEnabled
      />

      {/* Sin datos */}
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
  leyenda: {
    backgroundColor: 'white',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
  },
  leyendaTitulo: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  actualizar:    { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  sinDatos: {
    position: 'absolute', bottom: 32, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  sinDatosTxt: { color: '#94A3B8', fontSize: 13 },
});

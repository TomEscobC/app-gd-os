import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../../src/api/client';

export default function CompletarScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const [foto,     setFoto]     = useState<string | null>(null);
  const [coords,   setCoords]   = useState<{ lat: number; lon: number } | null>(null);
  const [cargando, setCargando] = useState(false);

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const obtenerUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicación.');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    Alert.alert('Ubicación obtenida', `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
  };

  const confirmar = async () => {
    if (!foto) {
      Alert.alert('Foto requerida', 'Toma una foto de la instalación.');
      return;
    }
    if (!coords) {
      Alert.alert('Ubicación requerida', 'Obtén tu ubicación GPS antes de confirmar.');
      return;
    }

    setCargando(true);
    try {
      const form = new FormData();
      form.append('latitud',  String(coords.lat));
      form.append('longitud', String(coords.lon));
      form.append('foto', {
        uri:  foto,
        name: `instalacion_${id}.jpg`,
        type: 'image/jpeg',
      } as any);

      await api.post(`/instalacion/${id}/completar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('¡Instalación completada!', 'Se registró correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo completar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.titulo}>Completar instalación #{id}</Text>

      {/* Foto */}
      <TouchableOpacity style={styles.fotoBox} onPress={tomarFoto}>
        {foto
          ? <Image source={{ uri: foto }} style={styles.fotoPreview} />
          : (
            <View style={styles.fotoPlaceholder}>
              <Text style={styles.fotoIcon}>📷</Text>
              <Text style={styles.fotoTxt}>Tomar foto de evidencia</Text>
            </View>
          )
        }
      </TouchableOpacity>

      {/* GPS */}
      <TouchableOpacity
        style={[styles.btn, styles.btnSecundario]}
        onPress={obtenerUbicacion}
      >
        <Text style={styles.btnSecundarioTxt}>
          {coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : '📍 Obtener ubicación GPS'}
        </Text>
      </TouchableOpacity>

      {/* Confirmar */}
      <TouchableOpacity
        style={[styles.btn, styles.btnPrimario, cargando && styles.btnDeshabilitado]}
        onPress={confirmar}
        disabled={cargando}
      >
        {cargando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnPrimarioTxt}>Confirmar instalación</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  titulo:     { fontSize: 18, fontWeight: '700', color: '#1E3A8A', marginBottom: 20 },
  fotoBox:    { borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 240, backgroundColor: '#E2E8F0' },
  fotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fotoIcon:   { fontSize: 40, marginBottom: 8 },
  fotoTxt:    { color: '#64748B', fontSize: 14 },
  btn:        { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnPrimario: { backgroundColor: '#1E3A8A' },
  btnPrimarioTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1' },
  btnSecundarioTxt: { color: '#1E3A8A', fontSize: 14, fontWeight: '600' },
  btnDeshabilitado: { opacity: 0.6 },
});

import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import SignatureCanvas from 'react-native-signature-canvas';
import api from '../../src/api/client';

export default function CompletarScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const sigRef  = useRef<any>(null);

  const [foto,      setFoto]      = useState<string | null>(null);
  const [coords,    setCoords]    = useState<{ lat: number; lon: number } | null>(null);
  const [firma,     setFirma]     = useState<string | null>(null);
  const [cargando,  setCargando]  = useState(false);
  const [mostrarFirma, setMostrarFirma] = useState(false);

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const obtenerUbicacion = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Se necesita acceso a la ubicación.'); return; }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    Alert.alert('✅ Ubicación obtenida', `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
  };

  const confirmar = async () => {
    if (!foto)   { Alert.alert('Foto requerida', 'Toma una foto de evidencia.'); return; }
    if (!coords) { Alert.alert('GPS requerido', 'Obtén tu ubicación antes de confirmar.'); return; }
    if (!firma)  { Alert.alert('Firma requerida', 'El cliente debe firmar para confirmar.'); return; }

    setCargando(true);
    try {
      const form = new FormData();
      form.append('latitud',  String(coords.lat));
      form.append('longitud', String(coords.lon));
      form.append('foto', { uri: foto, name: `instalacion_${id}.jpg`, type: 'image/jpeg' } as any);

      await api.post(`/instalacion/${id}/completar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('¡Instalación completada! ✅', 'Se registró con foto, GPS y firma del cliente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo completar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.titulo}>Instalación #{id}</Text>

      {/* Foto */}
      <Text style={s.label}>1. Foto de evidencia</Text>
      <TouchableOpacity style={s.fotoBox} onPress={tomarFoto}>
        {foto
          ? <Image source={{ uri: foto }} style={s.fotoPreview} />
          : <View style={s.fotoPlaceholder}>
              <Text style={s.fotoIcono}>📷</Text>
              <Text style={s.fotoTxt}>Tomar foto</Text>
            </View>
        }
      </TouchableOpacity>

      {/* GPS */}
      <Text style={s.label}>2. Ubicación GPS</Text>
      <TouchableOpacity style={[s.btn, s.btnSecundario]} onPress={obtenerUbicacion}>
        <Text style={s.btnSecundarioTxt}>
          {coords ? `✅ ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` : '📍 Obtener ubicación'}
        </Text>
      </TouchableOpacity>

      {/* Firma */}
      <Text style={s.label}>3. Firma del cliente</Text>
      {!firma ? (
        <>
          {mostrarFirma ? (
            <View style={s.firmaContainer}>
              <SignatureCanvas
                ref={sigRef}
                onOK={(sig: string) => { setFirma(sig); setMostrarFirma(false); }}
                onEmpty={() => Alert.alert('Firma vacía', 'Por favor dibuja la firma.')}
                descriptionText=""
                clearText="Limpiar"
                confirmText="Confirmar firma"
                webStyle={`.m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--footer { background: #F8FAFC; } body { background: #F8FAFC; }`}
              />
              <TouchableOpacity style={s.btnCancelarFirma} onPress={() => setMostrarFirma(false)}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[s.btn, s.btnSecundario]} onPress={() => setMostrarFirma(true)}>
              <Text style={s.btnSecundarioTxt}>✍️ Capturar firma del cliente</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={s.firmaOk}>
          <Text style={s.firmaOkTxt}>✅ Firma capturada</Text>
          <TouchableOpacity onPress={() => setFirma(null)}>
            <Text style={{ color: '#EF4444', fontSize: 12 }}>Repetir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmar */}
      <TouchableOpacity
        style={[s.btn, s.btnPrimario, cargando && s.btnDisabled]}
        onPress={confirmar}
        disabled={cargando}
      >
        {cargando
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnPrimarioTxt}>Confirmar instalación</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  titulo:       { fontSize: 18, fontWeight: '700', color: '#1E3A8A', marginBottom: 20 },
  label:        { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 4 },
  fotoBox:      { borderRadius: 12, overflow: 'hidden', marginBottom: 16, height: 200, backgroundColor: '#E2E8F0' },
  fotoPreview:  { width: '100%', height: '100%', resizeMode: 'cover' },
  fotoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fotoIcono:    { fontSize: 36, marginBottom: 6 },
  fotoTxt:      { color: '#64748B', fontSize: 13 },
  btn:          { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnPrimario:  { backgroundColor: '#1E3A8A', marginTop: 8 },
  btnPrimarioTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1' },
  btnSecundarioTxt: { color: '#1E3A8A', fontSize: 14, fontWeight: '600' },
  btnDisabled:  { opacity: 0.6 },
  firmaContainer: { height: 280, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#CBD5E1' },
  btnCancelarFirma: { alignItems: 'center', paddingVertical: 8 },
  firmaOk:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginBottom: 12 },
  firmaOkTxt:   { color: '#065F46', fontWeight: '600', fontSize: 13 },
});

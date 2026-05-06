import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';

export default function LoginScreen() {
  const { login } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [tipo,     setTipo]     = useState<'instalador' | 'admin'>('instalador');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa email y contraseña.');
      return;
    }

    setCargando(true);
    try {
      await login(email.trim().toLowerCase(), password, tipo);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error de conexión';
      Alert.alert('Error', msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.titulo}>Global Design</Text>
        <Text style={styles.subtitulo}>Sistema Operativo</Text>

        {/* Selector de tipo */}
        <View style={styles.tipoRow}>
          {(['instalador', 'admin'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tipoBtn, tipo === t && styles.tipoBtnActivo]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.tipoBtnTxt, tipo === t && styles.tipoBtnTxtActivo]}>
                {t === 'instalador' ? 'Instalador' : 'Admin'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btn, cargando && styles.btnDeshabilitado]}
          onPress={handleLogin}
          disabled={cargando}
        >
          {cargando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnTxt}>Ingresar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const AZUL = '#1E3A8A';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: AZUL,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  tipoRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 20,
  },
  tipoBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tipoBtnActivo: { backgroundColor: AZUL },
  tipoBtnTxt:    { color: '#64748B', fontWeight: '600' },
  tipoBtnTxtActivo: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
    color: '#1E293B',
  },
  btn: {
    backgroundColor: AZUL,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDeshabilitado: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

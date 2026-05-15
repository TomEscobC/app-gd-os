import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../src/store/auth.store';

export default function AppLayout() {
  const { logout, usuario } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutTxt}>Salir</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="ruta"          options={{ title: 'Mi Ruta del Día' }} />
      <Stack.Screen name="completar"     options={{ title: 'Completar Instalación' }} />
      <Stack.Screen name="dashboard"     options={{ title: 'Dashboard' }} />
      <Stack.Screen name="cotizaciones"  options={{ title: 'Cotizaciones' }} />
      <Stack.Screen name="mapa"          options={{ title: 'Instaladores en Terreno' }} />
      <Stack.Screen name="alertas"       options={{ title: 'Alertas IoT' }} />
      <Stack.Screen name="reportes"      options={{ title: 'Reportes' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logoutBtn: { marginRight: 8, paddingHorizontal: 8, paddingVertical: 4 },
  logoutTxt: { color: '#fff', fontSize: 14 },
});

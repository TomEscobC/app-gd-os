import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

export default function RootLayout() {
  const { token, loading, cargarSesion } = useAuthStore();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    cargarSesion();
  }, []);

  useEffect(() => {
    if (loading) return;

    const enAuth = segments[0] === '(auth)';

    if (!token && !enAuth) {
      router.replace('/(auth)/login');
    } else if (token && enAuth) {
      router.replace('/(app)/ruta');
    }
  }, [token, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

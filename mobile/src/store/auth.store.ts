import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, password: string, tipo: 'admin' | 'instalador') => Promise<void>;
  logout: () => Promise<void>;
  cargarSesion: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  usuario: null,
  loading: true,

  login: async (email, password, tipo) => {
    const { data } = await api.post('/auth/login', { email, password, tipo });
    const { token, usuario } = data.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('usuario', JSON.stringify(usuario));
    set({ token, usuario });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'usuario']);
    set({ token: null, usuario: null });
  },

  cargarSesion: async () => {
    const token   = await AsyncStorage.getItem('token');
    const raw     = await AsyncStorage.getItem('usuario');
    const usuario = raw ? JSON.parse(raw) : null;
    set({ token, usuario, loading: false });
  },
}));

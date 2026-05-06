import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// En desarrollo apunta al backend local.
// En producción reemplazar con la URL del servidor.
const BASE_URL = 'https://app-gd-os.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

// Adjunta el JWT en cada request automáticamente
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

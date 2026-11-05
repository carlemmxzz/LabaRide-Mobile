import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { connectionErrorMessage, resolveApiUrl } from "./api-address";

// Native development can use Metro's LAN host when .env is absent or still
// contains localhost. Explicit LAN and hosted backend URLs remain authoritative.
export const API_URL = resolveApiUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  development: __DEV__,
  expoHostUri: Constants.expoConfig?.hostUri,
});

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data?.error || error.response?.data;
    // Forbidden resources do not invalidate a session. Keep legacy token-expiry
    // responses working while the backend returns those as 403.
    const invalidSession = status === 401 || status === 403 && (
      payload?.code === 'ACCOUNT_BLOCKED' || payload?.message === 'Invalid or expired token'
    );
    const auth = useAuthStore.getState();
    if (invalidSession && auth.token && error.config?.headers?.Authorization === `Bearer ${auth.token}`) {
      // A delayed response from an old login must not clear a newer session.
      void auth.logout().catch(() => {});
    }
    if (!error.response && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error.code)) {
      return Promise.reject(connectionErrorMessage(API_URL, error.code !== "ERR_NETWORK", Platform.OS));
    }
    return Promise.reject(error.response?.data?.error || error.response?.data?.message || error.response?.data || error.message);
  },
);

export default apiClient;

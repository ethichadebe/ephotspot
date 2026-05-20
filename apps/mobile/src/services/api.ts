import Keychain from 'react-native-keychain';

const API_URL = __DEV__
  ? 'http://192.168.18.11:3000'   // emulator — change to your LAN IP for physical device testing (e.g. http://192.168.1.x:3000)
  : 'https://api.ephotspot.co.za'; // production

const TOKEN_SERVICE = 'ephotspot_token';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('token', token, { service: TOKEN_SERVICE });
}

export async function getToken(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
  return creds ? creds.password : null;
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

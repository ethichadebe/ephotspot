import { NativeModules, Platform } from 'react-native';

// WifiNetworkSuggestion API requires Android 10+ (API 29+)
// For Android 9 and below, show manual password screen instead

export function isAutoConnectSupported(): boolean {
  return Platform.OS === 'android' && (Platform.Version as number) >= 29;
}

export async function registerWifiSuggestion(ssid: string, password: string): Promise<void> {
  if (!isAutoConnectSupported()) return; // fallback handled in UI
  try {
    // Uses react-native-wifi-reborn or custom native module
    // TODO: link a wifi suggestion native module — placeholder for now
    const WifiModule = NativeModules.WifiSuggestion;
    if (WifiModule?.addSuggestion) {
      await WifiModule.addSuggestion(ssid, password);
    }
  } catch (err) {
    console.warn('WifiNetworkSuggestion registration failed:', err);
  }
}

export async function removeWifiSuggestion(ssid: string): Promise<void> {
  try {
    const WifiModule = NativeModules.WifiSuggestion;
    if (WifiModule?.removeSuggestion) {
      await WifiModule.removeSuggestion(ssid);
    }
  } catch (err) {
    console.warn('WifiNetworkSuggestion removal failed:', err);
  }
}

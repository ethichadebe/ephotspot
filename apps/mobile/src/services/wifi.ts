import { NativeModules, Platform } from 'react-native';

// WifiNetworkSuggestion API requires Android 10+ (API 29+)
// For Android 9 and below, show manual password screen instead

export function isAutoConnectSupported(): boolean {
  return Platform.OS === 'android' && (Platform.Version as number) >= 29;
}

// EPHotspot SSIDs: open guest SSID for onboarding, same open SSID for authenticated access.
// MikroTik Hotspot handles auth via captive portal — no WPA key on the SSID itself.
export const EPHOTSPOT_SSID = 'EPHotspot';

export async function registerWifiSuggestion(ssid: string): Promise<void> {
  if (!isAutoConnectSupported()) return; // fallback handled in UI
  try {
    // TODO: link a wifi suggestion native module — placeholder for now
    // For open (no WPA) networks, call addSuggestion with no password argument
    const WifiModule = NativeModules.WifiSuggestion;
    if (WifiModule?.addOpenSuggestion) {
      await WifiModule.addOpenSuggestion(ssid);
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

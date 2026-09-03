import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aethora.app',
  appName: 'Aethora',
  webDir: 'dist',
  server: {
    url: 'https://legend-forge-fitness.vercel.app',
    cleartext: false
  }
};

export default config;
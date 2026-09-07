import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inapymi.sat',
  appName: 'SAT',
  webDir: 'dist',
  server: {
    // URL de producción del servidor SAT
    url: 'https://sat.inapymi.gob.ve',
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;

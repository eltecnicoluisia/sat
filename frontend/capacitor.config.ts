import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.informaticosvenezuela.sat',
  appName: 'SAT Informáticos Venezuela',
  webDir: 'dist',
  server: {
    // URL de producción del servidor SAT
    url: 'https://sat.informaticosvenezuela.com',
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;

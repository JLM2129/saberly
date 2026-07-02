import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saberly.app',
  appName: 'Saberly',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

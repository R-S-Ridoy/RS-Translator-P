import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prochain.translator',
  appName: 'ProChain Translator',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

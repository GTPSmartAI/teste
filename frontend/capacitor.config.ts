import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gtpsmart.mangaflix',
  appName: 'Mangaflix Prime',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  backgroundColor: '#040906',
};

export default config;

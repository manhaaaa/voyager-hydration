import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.manh.voyagerhydration',
  appName: 'Voyager Hydration',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#38BDF8',
      sound: 'voyager_violin.mp3',
    },
  },
};

export default config;

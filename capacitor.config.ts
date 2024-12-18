import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.toolworks.trustynotes',
  appName: 'TrustyNotes',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'notes.toolworks.dev',
    iosScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '#ffffff'
  }
};

export default config;
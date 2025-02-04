import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';

export const initializeAndroidApp = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1A1B1E' });
    
    await SplashScreen.hide({
      fadeOutDuration: 500
    });

    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });

    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        await Preferences.set({
          key: 'lastActiveTime',
          value: new Date().toISOString()
        });
      }
    });

    App.addListener('backButton', () => {
    });

  } catch (error) {
    console.error('Error initializing Android app:', error);
  }
}; 
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';

export const initializeMobileApp = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    
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

  } catch (error) {
    console.error('Error initializing mobile app:', error);
  }
};
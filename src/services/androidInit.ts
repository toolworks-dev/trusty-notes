import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { Dialog } from '@capacitor/dialog';

export const initializeAndroidApp = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1A1B1E' });
    
    await SplashScreen.hide({
      fadeOutDuration: 500
    });

    document.body.classList.add('android');
    
    Keyboard.addListener('keyboardWillShow', (info: any) => {
      document.body.classList.add('keyboard-visible');
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
      document.documentElement.style.removeProperty('--keyboard-height');
    });

    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        await Preferences.set({
          key: 'lastActiveTime',
          value: new Date().toISOString()
        });
      }
    });

    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        Dialog.confirm({
          title: 'Exit App',
          message: 'Are you sure you want to exit the app?',
          okButtonTitle: 'Exit',
          cancelButtonTitle: 'Cancel'
        }).then(({ value }: { value: boolean }) => {
          if (value) {
            App.exitApp();
          }
        });
      }
    });

    const setAppHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    setAppHeight();

    window.addEventListener('resize', setAppHeight);

  } catch (error) {
    console.error('Error initializing Android app:', error);
  }
}; 
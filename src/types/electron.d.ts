interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  versions: {
    node: string;
    electron: string;
  };
  minimizeToTray: () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 
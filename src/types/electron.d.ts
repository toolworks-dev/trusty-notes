interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  versions: {
    node: string;
    electron: string;
  };
  minimizeToTray: () => void;
  updates: {
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
    openReleasePage: (url: string) => void;
  }
}

interface UpdateInfo {
  version: string;
  releaseUrl: string;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 
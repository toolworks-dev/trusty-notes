interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  versions: {
    node: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {}; 
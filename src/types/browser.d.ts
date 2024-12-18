declare namespace chrome {
  namespace runtime {
    function sendMessage(
      extensionId: string,
      message: any,
      options?: { includeTlsChannelId?: boolean }
    ): Promise<any>;
  }
}

// For compatibility with Firefox
declare const browser: typeof chrome; 
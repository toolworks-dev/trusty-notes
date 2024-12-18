function getStorageData() {
  const settings = localStorage.getItem('sync_settings');
  const notes = localStorage.getItem('notes');
  document.dispatchEvent(new CustomEvent('get-storage-data', { 
    detail: { 
      settings: settings,
      notes: notes
    }
  }));
}

getStorageData(); 
async function testExtension() {
  await chrome.storage.local.set({ test: 'value' });
  const result = await chrome.storage.local.get(['test']);
  console.assert(result.test === 'value', 'Storage test failed');

  chrome.runtime.sendMessage({
    type: 'TEST',
    data: 'test data'
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
  testExtension();
} 
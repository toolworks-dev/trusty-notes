import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const browser = process.argv[2] || 'chrome';

const manifestPath = resolve(__dirname, `manifest.${browser}.json`);
try {
    await fs.access(manifestPath);
} catch {
    console.error(`No manifest found for browser: ${browser}`);
    process.exit(1);
}

await fs.copyFile(manifestPath, resolve(__dirname, 'manifest.json'));
console.log(`Built manifest for ${browser}`); 
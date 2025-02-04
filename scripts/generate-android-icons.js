import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICON_SIZES = {
    'mipmap-mdpi': {
        launcher: 48,
        foreground: 108
    },
    'mipmap-hdpi': {
        launcher: 72,
        foreground: 162
    },
    'mipmap-xhdpi': {
        launcher: 96,
        foreground: 216
    },
    'mipmap-xxhdpi': {
        launcher: 144,
        foreground: 324
    },
    'mipmap-xxxhdpi': {
        launcher: 192,
        foreground: 432
    }
};

async function generateIcons() {
    const sourceImage = join(__dirname, '../public/trusty.jpg');
    const androidResDir = join(__dirname, '../android/app/src/main/res');

    for (const [folder, sizes] of Object.entries(ICON_SIZES)) {
        const folderPath = join(androidResDir, folder);
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        // Generate launcher icon
        await sharp(sourceImage)
            .resize(sizes.launcher, sizes.launcher)
            .toFile(join(folderPath, 'ic_launcher.png'));

        // Generate round launcher icon
        await sharp(sourceImage)
            .resize(sizes.launcher, sizes.launcher)
            .toFile(join(folderPath, 'ic_launcher_round.png'));

        // Generate foreground icon
        await sharp(sourceImage)
            .resize(sizes.foreground, sizes.foreground)
            .toFile(join(folderPath, 'ic_launcher_foreground.png'));
    }

    console.log('Android icons generated successfully!');
}

generateIcons().catch(console.error); 
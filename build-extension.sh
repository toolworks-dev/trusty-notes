bun run build:chrome
cd browser-extension
web-ext build --overwrite-dest
mv web-ext-artifacts/trusty_notes-0.2.0.zip web-ext-artifacts/trusty_notes-chrome-0.2.0.zip
rm manifest.json
cd ..
bun run build:firefox
cd browser-extension
web-ext build --overwrite-dest
mv web-ext-artifacts/trusty_notes-0.2.0.zip web-ext-artifacts/trusty_notes-firefox-0.2.0.zip
rm manifest.json

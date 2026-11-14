// Export the approved SVG without redrawing it. Requires Node 26, Playwright and
// Chromium and ImageMagick as developer tools; they are not app dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.GROUPIFY_PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const directory = path.resolve(__dirname, '../assets/brand');
  const source = await fs.readFile(path.join(directory, 'groupify-mark.svg'));
  const browser = await chromium.launch({
    executablePath: process.env.GROUPIFY_CHROMIUM_PATH || undefined,
    // Only enable this for an isolated container whose Chromium requires it.
    args: process.env.GROUPIFY_EXPORT_NO_SANDBOX === '1' ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    const exports = await page.evaluate(async (svg) => {
      const source = new Image();
      source.src = `data:image/svg+xml;base64,${svg}`;
      await source.decode();
      return [
        { file: 'groupify-app-icon.png', size: 1024, mark: 900, opaque: true },
        { file: 'groupify-adaptive-foreground.png', size: 1024, mark: 600, opaque: false },
        { file: 'groupify-splash-mark.png', size: 1024, mark: 1024, opaque: false },
        { file: 'groupify-favicon.png', size: 48, mark: 42, opaque: true },
      ].map((asset) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = asset.size;
        const context = canvas.getContext('2d', { alpha: !asset.opaque });
        if (asset.opaque) { context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, asset.size, asset.size); }
        const offset = (asset.size - asset.mark) / 2;
        context.drawImage(source, offset, offset, asset.mark, asset.mark);
        const pixels = context.getImageData(0, 0, asset.size, asset.size).data;
        let outsideSafeCircle = 0;
        let farthestPixel = 0;
        if (asset.file === 'groupify-adaptive-foreground.png') {
          for (let y = 0; y < asset.size; y++) for (let x = 0; x < asset.size; x++) {
            if (!pixels[(y * asset.size + x) * 4 + 3]) continue;
            const radius = Math.hypot(x + 0.5 - asset.size / 2, y + 0.5 - asset.size / 2);
            farthestPixel = Math.max(farthestPixel, radius);
            if (radius > asset.size * 33 / 108) outsideSafeCircle++;
          }
        }
        return { ...asset, png: canvas.toDataURL('image/png').split(',')[1], outsideSafeCircle, farthestPixel };
      });
    }, source.toString('base64'));
    for (const { file, png, outsideSafeCircle, farthestPixel, ...metadata } of exports) {
      assert.equal(outsideSafeCircle, 0, 'Visible adaptive artwork must fit the 66dp safe circle in a 108dp canvas');
      let bytes = Buffer.from(png, 'base64');
      // Canvas encodes RGBA even when opaque. Strip only that fully opaque alpha
      // channel for platforms requiring RGB icons; no SVG delegate is involved.
      if (metadata.opaque) bytes = execFileSync(process.env.GROUPIFY_IMAGE_CONVERTER || 'convert',
        ['png:-', '-alpha', 'off', '-strip', '-depth', '8', '-define', 'png:color-type=2', 'png:-'], { input: bytes, maxBuffer: 16 * 1024 * 1024 });
      assert.equal(bytes.readUInt32BE(16), metadata.size);
      assert.equal(bytes.readUInt32BE(20), metadata.size);
      assert.equal(bytes[25], metadata.opaque ? 2 : 6, 'PNG must be RGB or RGBA as appropriate');
      await fs.writeFile(path.join(directory, file), bytes);
      console.log(JSON.stringify({ file, ...metadata, outsideSafeCircle, farthestPixel: Math.round(farthestPixel * 100) / 100 }));
    }
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

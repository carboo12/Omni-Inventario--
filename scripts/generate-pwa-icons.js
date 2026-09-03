/**
 * Script para regenerar íconos PWA desde los SVGs base.
 * Ejecutar: node scripts/generate-pwa-icons.js
 * Requiere: sharp (devDependency)
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SVG_SOURCE = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const SVG_MASKABLE = path.join(__dirname, '..', 'public', 'icons', 'icon-maskable.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generate() {
  if (!fs.existsSync(SVG_SOURCE)) {
    console.error('SVG source not found:', SVG_SOURCE);
    process.exit(1);
  }

  for (const size of SIZES) {
    const outFile = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SVG_SOURCE).resize(size, size).png().toFile(outFile);
    console.log(`Created icon-${size}x${size}.png`);
  }

  for (const size of [192, 512]) {
    const outFile = path.join(OUTPUT_DIR, `maskable-${size}x${size}.png`);
    const src = fs.existsSync(SVG_MASKABLE) ? SVG_MASKABLE : SVG_SOURCE;
    await sharp(src).resize(size, size).png().toFile(outFile);
    console.log(`Created maskable-${size}x${size}.png`);
  }

  const appleOut = path.join(__dirname, '..', 'public', 'apple-touch-icon.png');
  await sharp(SVG_SOURCE).resize(180, 180).png().toFile(appleOut);
  console.log('Created apple-touch-icon.png');

  console.log('\nAll PWA icons generated successfully!');
  console.log('To customize: edit public/icons/icon.svg and icon-maskable.svg, then re-run this script.');
}

generate().catch((err) => {
  console.error('Error generating icons:', err.message);
  process.exit(1);
});

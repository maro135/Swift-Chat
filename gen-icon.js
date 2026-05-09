const fs = require('fs');

const svgCode = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#030712"/>
  <text x="256" y="290" font-family="Arial" font-size="200" font-weight="bold" fill="#3b82f6" text-anchor="middle">S</text>
</svg>`;

const svg192Code = `<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#030712"/>
  <text x="96" y="110" font-family="Arial" font-size="80" font-weight="bold" fill="#3b82f6" text-anchor="middle">S</text>
</svg>`;

fs.writeFileSync('public/pwa-512x512.svg', svgCode);
fs.writeFileSync('public/pwa-192x192.svg', svg192Code);

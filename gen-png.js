const fs = require('fs');

// 1x1 transparent PNG base64
const transparentPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(transparentPng, 'base64');
fs.writeFileSync('public/pwa-192x192.png', buffer);
fs.writeFileSync('public/pwa-512x512.png', buffer);

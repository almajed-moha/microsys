import fs from 'fs';
const base64Icon192 = 'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAwKADAAQAAAABAAAAwAAAAAA/U8R4AAAAsUlEQVR4Ae3XMQEAAAzCQKp/6VzB1w/IMMDZ088BAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAoAGmYgABz4LwUAAAAABJRU5ErkJggg==';
const buffer192 = Buffer.from(base64Icon192, 'base64');
fs.writeFileSync('public/pwa-192x192.png', buffer192);
fs.writeFileSync('public/pwa-512x512.png', buffer192);
fs.writeFileSync('public/favicon.ico', buffer192);
fs.writeFileSync('public/apple-touch-icon.png', buffer192);
fs.writeFileSync('public/mask-icon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="#0f172a"/></svg>');

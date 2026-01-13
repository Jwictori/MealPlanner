// Polyfills för React Native bridgeless mode
// Importera FÖRE allt annat

// TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('text-encoding').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('text-encoding').TextDecoder;
}

// FormData finns redan i React Native 0.81+
// Men om den saknas kan vi polyfilla:
if (typeof global.FormData === 'undefined') {
  global.FormData = require('react-native/Libraries/Network/FormData');
}

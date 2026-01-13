const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// SDK 54+ auto-configures monorepos
const config = getDefaultConfig(__dirname);

// Monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve modules from monorepo root first (hoisted), then mobile's node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];

// Use extraNodeModules to ensure consistent React resolution from root
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-dom': path.resolve(monorepoRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;

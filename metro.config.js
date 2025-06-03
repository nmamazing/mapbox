const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
defaultConfig.resolver.assetExts = [
  'ttf', 'png', 'jpg', 'jpeg', 'gif', 'webp'
];

module.exports = defaultConfig; 
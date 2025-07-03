const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
defaultConfig.resolver.assetExts = [
  'ttf', 'png', 'jpg', 'jpeg', 'gif', 'webp'
];

// Add SVG transformer
defaultConfig.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
defaultConfig.resolver.sourceExts.push('svg');

module.exports = defaultConfig; 
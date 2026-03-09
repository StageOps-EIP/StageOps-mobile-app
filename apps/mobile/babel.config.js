module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@app': './src/app',
            '@features': './src/features',
            '@infra': './src/infra',
            '@shared': './src/shared',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};

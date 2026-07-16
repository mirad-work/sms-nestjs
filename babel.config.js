module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    // Emits the design:paramtypes metadata that Nest's injector reads. Without
    // it, @Inject() tokens are dropped and every DI resolution fails under Jest
    // even though the tsc-built output works fine.
    'babel-plugin-transform-typescript-metadata',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
  ],
};

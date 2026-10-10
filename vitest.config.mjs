export default {
  resolve: process.env.BLACKOUT_TOOLCHAIN ? {
    alias: { vitest: `${process.env.BLACKOUT_TOOLCHAIN}/node_modules/vitest/dist/index.js` }
  } : undefined,
  test: { include: ['tests/**/*.test.ts'], environment: 'node', cache: false }
};

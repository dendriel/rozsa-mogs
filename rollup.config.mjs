// Contents of the file /rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
const config = [
    {
        input: 'dist/compiled/index.js',
        output: {
            file: 'dist/compiled/rozsa-mogs.js',
            format: 'cjs',
            sourcemap: true
        },
        external: ['socket.io', 'socket.io-client'],
        inlineDynamicImports: true, // ✅ Inline all dynamic imports
        plugins: [typescript()]
    }, {
        input: 'dist/compiled/index.d.ts',
        output: {
            file: 'dist/compiled/rozsa-mogs.d.ts',
            format: 'es'
        },
        plugins: [dts()]
    }
];
export default config;
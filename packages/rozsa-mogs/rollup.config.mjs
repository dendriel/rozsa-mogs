import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";

const config = [
    {
        input: 'dist/compiled/index.js', // syntax allowed by multiEntry plugin
        output: {
            file: 'dist/compiled/rozsa-mogs.js',
            format: 'cjs',
            sourcemap: true,
            // Use module.exports to bundle exports together. Expects 'export default' defined (it is in index.ts)
            exports: 'default'
        },
        external: ['socket.io', 'http', 'express'],
        plugins: [typescript()]
    }, {
        input: 'dist/compiled/index.d.ts',
        output: {
            file: 'dist/compiled/rozsa-mogs.d.ts',
            format: 'es'
        },
        external: ['socket.io', 'http', 'express'],
        plugins: [dts()]
    }
];
export default config;
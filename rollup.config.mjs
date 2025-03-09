// Contents of the file /rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
const config = [
    {
        input: 'dist/compiled/network-server.js',
        output: {
            file: 'dist/compiled/rozsa-mogs.js',
            format: 'cjs',
            sourcemap: true,
        },
        // external: ['axios', 'os', 'url'],
        plugins: [typescript()]
    }, {
        input: 'dist/compiled/network-server.d.ts',
        output: {
            file: 'dist/compiled/rozsa-mogs.d.ts',
            format: 'es'
        },
        plugins: [dts()]
    }
];
export default config;
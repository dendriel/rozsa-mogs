import typescript from '@rollup/plugin-typescript';
import resolve from "@rollup/plugin-node-resolve"; // Finds dependencies in node_modules
import commonjs from "@rollup/plugin-commonjs"; // Converts CommonJS to ES Modules
import dts from 'rollup-plugin-dts';


const config = [
    {
        input: 'dist/compiled/network-client.js',
        output: {
            file: 'dist/compiled/rozsa-mogs-client.js',
            format: 'esm', // (ES Modules)
            sourcemap: true
        },
        external: ['socket.io-client'],
        plugins: [typescript({ tsconfig: "./tsconfig.json" }),
                    resolve(), // Resolve dependencies in `node_modules`
                    commonjs(), // Convert CommonJS to ES Modules
                ]
    }, {
        input: 'dist/compiled/network-client.d.ts',
        output: {
            file: 'dist/compiled/rozsa-mogs-client.d.ts',
            format: 'es'
        },
        plugins: [dts()]
    }
];
export default config;
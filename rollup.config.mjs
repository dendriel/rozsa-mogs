// Contents of the file /rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
    {
        // Server build (CommonJS)
        input: 'dist/compiled/network-server.js',
        output: {
            file: 'dist/compiled/rozsa-mogs.js',
            format: 'cjs',
            exports: "auto", // Ensures compatibility with both ESM and CJS
            sourcemap: true
            // globals: {
            //     "socket.io-client": "io"  // Map "socket.io-client" to `io` (global variable in the browser)
            // }
        },
        external: ['socket.io'],
        plugins: [typescript()]
    },
    {
        input: 'dist/compiled/network-server.d.ts',
        output: {
            file: 'dist/compiled/rozsa-mogs.d.ts',
            format: 'es'
        },
        plugins: [dts()]
    },
    // Browser-friendly build
    {
        input: "dist/compiled/network-client.js",
        output: {
            file: "dist/compiled/rozsa-mogs-client.js",
            format: "es", // Use "es" for ES module
            name: "RozsaMogs", // Required for UMD to work in browser
        },
        external: ["socket.io-client"], // If you don't want to bundle socket.io-client, leave it external
        plugins: [
            resolve({ browser: true }), // Ensures browser-friendly builds
            commonjs(),
            typescript(),
        ]
    },
    {
        input: 'dist/compiled/network-client.d.ts',
        output: {
            file: 'dist/compiled/rozsa-mogs-client.d.ts',
            format: 'es'
        },
        plugins: [dts()]
    }
];

// const xpto = [
//     // Server build (CommonJS)
//     {
//         input: "src/index.ts",
//         output: {
//             file: "dist/server.js",
//             format: "cjs",
//             exports: "auto" // Ensures compatibility with both ESM and CJS
//         },
//         external: ["fs", "path", "http", "express"], // Exclude Node.js built-ins & dependencies
//         plugins: [resolve(), commonjs(), typescript()]
//     },
//
//     // Browser-friendly build
//     {
//         input: "src/index.ts",
//         output: {
//             file: "dist/browser.js",
//             format: "umd", // Use "es" for ES module
//             name: "MyLibrary", // Required for UMD to work in browser
//         },
//         external: ["socket.io-client"], // If you don't want to bundle socket.io-client, leave it external
//         plugins: [
//             resolve({ browser: true }), // Ensures browser-friendly builds
//             commonjs(),
//             typescript(),
//         ]
//     },
//
//     // TypeScript Declaration Files
//     {
//         input: "src/index.ts",
//         output: { dir: "dist", format: "es" }, // Generate TypeScript definitions
//         plugins: [require("rollup-plugin-dts").default()]
//     }
// ];
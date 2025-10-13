import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Use the web-specific HTML file
  root: ".",
  publicDir: "public",

  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },

  // Web-specific configuration
  server: {
    port: 3001,
    strictPort: false,
    open: "/index.web.html",
    proxy: {
      // Proxy Splice GraphQL API
      "/api/graphql": {
        target: "https://surfaces-graphql.splice.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/graphql/, "/graphql"),
        headers: {
          Origin: "https://splice.com",
          Referer: "https://splice.com/",
        },
      },
      // Proxy Splice S3 audio files
      "/api/s3": {
        target: "https://spliceproduction.s3.us-west-1.amazonaws.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/s3/, ""),
        headers: {
          Origin: "https://splice.com",
          Referer: "https://splice.com/",
        },
      },
    },
  },

  // Remove Tauri-specific settings
  clearScreen: true,

  // Web build configuration
  build: {
    outDir: "dist-web",
    sourcemap: true,
    rollupOptions: {
      input: "index.web.html",
    },
  },
});

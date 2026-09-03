import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Order matters: the more-specific @/convex alias must come first
    // so imports like `@/convex/_generated/api.js` don't fall through
    // to the general `@` alias (which would resolve them under ./src).
    alias: [
      { find: /^@\/convex\/(.*)/, replacement: path.resolve(__dirname, "./convex") + "/$1" },
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, "./src") + "/$1" },
    ],
  },
  server: {
    port: 5173,
    host: true,
  },
});

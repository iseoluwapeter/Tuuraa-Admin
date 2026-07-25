import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  optimizeDeps: {
    include: ["react-data-table-component"],
  },
  build: {
    commonjsOptions: {
      include: [/react-data-table-component/, /node_modules/],
    },
  },
});

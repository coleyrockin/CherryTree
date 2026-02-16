import { defineConfig } from "vite";

const tunnelHostAllowList = [".lhr.life", ".loca.lt"];
const extraHosts = (process.env.CHERRYTREE_ALLOWED_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const allowedHosts = ["127.0.0.1", "localhost", ...tunnelHostAllowList, ...extraHosts];

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts
  },
  build: {
    target: "es2021",
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) {
            return "vendor-three";
          }
          if (id.includes("node_modules/gsap")) {
            return "vendor-gsap";
          }
          if (id.includes("node_modules/lenis")) {
            return "vendor-lenis";
          }
          return undefined;
        }
      }
    }
  }
});

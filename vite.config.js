import { defineConfig } from "vite";

const exposeDevServer = process.env.CHERRYTREE_EXPOSE_DEV_SERVER === "true";
const tunnelHostAllowList = exposeDevServer ? [".lhr.life", ".loca.lt"] : [];
const extraHosts = exposeDevServer
  ? (process.env.CHERRYTREE_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean)
  : [];
const allowedHosts = ["127.0.0.1", "localhost", ...tunnelHostAllowList, ...extraHosts];
const devHost = exposeDevServer ? true : "127.0.0.1";

export default defineConfig({
  server: {
    host: devHost,
    port: 5173,
    allowedHosts
  },
  preview: {
    host: devHost,
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

import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, copyFile } from "fs/promises";
import path from "path";

const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "node-cron",
  "nodemailer",
  "passport",
  "passport-local",
  "rss-parser",
  "ws",
  "zod",
  "zod-validation-error",
];

async function buildDesktop() {
  console.log("=== Maker Desktop Build ===\n");

  await rm("dist", { recursive: true, force: true });

  console.log("[1/4] Building client (Vite)...");
  await viteBuild();

  console.log("[2/4] Bundling server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));
  externals.push("better-sqlite3");

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/server/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("[3/4] Compiling Electron main & preload...");
  await esbuild({
    entryPoints: ["electron/main.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/electron/main.cjs",
    external: ["electron", "better-sqlite3"],
    logLevel: "info",
  });

  await esbuild({
    entryPoints: ["electron/preload.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/electron/preload.cjs",
    external: ["electron"],
    logLevel: "info",
  });

  console.log("[4/4] Build complete!");
  console.log("\nOutput:");
  console.log("  dist/client/   — Frontend assets");
  console.log("  dist/server/   — Bundled server");
  console.log("  dist/electron/ — Electron main + preload");
  console.log("\nNext: npm run pack:desktop");
}

buildDesktop().catch((err) => {
  console.error("Desktop build failed:", err);
  process.exit(1);
});

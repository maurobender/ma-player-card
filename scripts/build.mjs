// Bundles src/ into dist/ma-player-card.js
//   node scripts/build.mjs         production build
//   node scripts/build.mjs --dev   rebuilds on save into dev/build/ and serves the mocks on http://localhost:8766/
import { readFile } from "node:fs/promises";
import * as esbuild from "esbuild";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const dev = process.argv.includes("--dev");

const options = {
  entryPoints: ["src/main.ts"],
  outfile: "dist/ma-player-card.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  charset: "utf8",
  legalComments: "inline",
  define: { __VERSION__: JSON.stringify(pkg.version) },
  banner: { js: `/* ma-player-card v${pkg.version} — built from src/ with \`npm run build\`. Do not edit by hand. */` },
  logLevel: "info",
};

if (dev) {
  const ctx = await esbuild.context({ ...options, outfile: "dev/build/ma-player-card.js", sourcemap: "inline" });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "dev", host: "127.0.0.1", port: 8766 });
  console.info(`Mocks at http://localhost:${port}/player.html and http://localhost:${port}/browser.html`);
} else {
  await esbuild.build(options);
}

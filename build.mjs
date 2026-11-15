import { readFileSync } from "node:fs";
import * as esbuild from "esbuild";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/npm-card.ts"],
  outfile: "dist/npm-card.js",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  legalComments: "none",
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}

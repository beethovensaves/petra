import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const execute = promisify(execFile);
const outputDirectory = new URL("../../.cache/m1-boundary/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const bundle = async (name) => {
  const input = new URL(`./client-${name}.ts`, import.meta.url);
  const output = new URL(`${name}.js`, outputDirectory);
  await execute(
    fileURLToPath(new URL("../../node_modules/.bin/esbuild", import.meta.url)),
    [
      input.pathname,
      "--bundle",
      "--format=esm",
      "--minify",
      "--platform=browser",
      `--outfile=${output.pathname}`,
    ],
    { cwd: fileURLToPath(new URL("../../", import.meta.url)) },
  );
  const bytes = await readFile(output);
  return { rawBytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength };
};

const baseline = await bundle("baseline");
const agUi = await bundle("ag-ui");
const measurement = {
  baseline,
  agUi,
  incremental: {
    rawBytes: agUi.rawBytes - baseline.rawBytes,
    gzipBytes: agUi.gzipBytes - baseline.gzipBytes,
  },
};

console.log(JSON.stringify(measurement, null, 2));

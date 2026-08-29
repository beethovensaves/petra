import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalize } from "json-canonicalize";
import { compileFromFile } from "json-schema-to-typescript";
import { format, resolveConfig } from "prettier";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const checkOnly = process.argv.includes("--check");
const prettierConfig = (await resolveConfig(packageRoot)) ?? {};
const registry = JSON.parse(
  await readFile(resolve(packageRoot, "registry.json"), "utf8"),
);

for (const entry of registry.schemas) {
  const schemaPath = resolve(packageRoot, entry.path);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const digest = `sha256:${createHash("sha256")
    .update(canonicalize(schema))
    .digest("hex")}`;
  if (entry.status === "accepted" && digest !== entry.canonical_sha256) {
    throw new Error(
      `Accepted schema ${entry.name}@${entry.version} changed without a new registry identity.`,
    );
  }
  if (entry.generate_typescript !== true) continue;

  const outputPath = resolve(packageRoot, entry.typescript_path);
  const source = await compileFromFile(schemaPath, {
    bannerComment:
      "/* eslint-disable */\n// Generated from the canonical Petra JSON Schema. Do not edit by hand.",
    style: {
      bracketSpacing: true,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "all",
      useTabs: false,
    },
  });
  await mkdir(dirname(outputPath), { recursive: true });
  const formattedSource = await format(source, {
    ...prettierConfig,
    parser: "typescript",
  });
  if (checkOnly) {
    let committedSource;
    try {
      committedSource = await readFile(outputPath, "utf8");
    } catch {
      throw new Error(
        `Generated declaration ${entry.typescript_path} is missing. Run npm run contracts:generate.`,
      );
    }
    if (committedSource !== formattedSource) {
      throw new Error(
        `Generated declaration ${entry.typescript_path} is stale. Run npm run contracts:generate and review the diff.`,
      );
    }
    continue;
  }
  await writeFile(outputPath, formattedSource, "utf8");
}

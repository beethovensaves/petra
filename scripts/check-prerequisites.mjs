import { execFileSync } from "node:child_process";

const required = {
  node: "24.20.0",
  npm: "11.19.0",
  python: "3.13.7",
};

function output(command, args = []) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

const observed = {
  node: process.version.replace(/^v/, ""),
  npm: output("npm", ["--version"]),
  uv: output("uv", ["--version"]),
  python: output("python3", ["--version"])?.replace(/^Python\s+/, "") ?? null,
  docker: output("docker", ["--version"]),
  compose: output("docker", ["compose", "version"]),
};

const failures = [];

for (const name of ["node", "npm", "python"]) {
  if (observed[name] !== required[name]) {
    failures.push(
      `${name}: expected ${required[name]}, observed ${observed[name] ?? "missing"}`,
    );
  }
}

if (observed.uv === null) failures.push("uv: missing");
if (observed.docker === null)
  failures.push("docker: missing or Docker Desktop is not running");
if (observed.compose === null)
  failures.push("docker compose: missing or Docker Desktop is not running");

for (const [name, version] of Object.entries(observed)) {
  console.log(`${name}: ${version ?? "missing"}`);
}

if (failures.length > 0) {
  console.error("\nPetra prerequisites are not satisfied:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

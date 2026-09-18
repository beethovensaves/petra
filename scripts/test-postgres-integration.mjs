import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "infra/postgres/integration.compose.yaml");
const projectName = `petra-m12-${process.pid}-${Date.now()}`;

const run = (program, args, options = {}) =>
  new Promise((resolveRun) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveRun(result);
    };
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      finish({ code: 1, signal: null, stdout, stderr: error.message });
    });
    child.on("close", (code, signal) => {
      finish({ code: code ?? 1, signal, stdout, stderr });
    });
  });

const composeArgs = (...args) => [
  "compose",
  "--project-name",
  projectName,
  "--file",
  composeFile,
  ...args,
];

const requireRun = async (program, args, options) => {
  const result = await run(program, args, options);
  if (result.code !== 0) {
    throw new Error(
      `${program} ${args.join(" ")} failed (${result.code}):\n${result.stderr || result.stdout}`,
    );
  }
  return result;
};

const resourceCount = async () => {
  const filter = `label=com.docker.compose.project=${projectName}`;
  const results = await Promise.all([
    run("docker", ["ps", "--all", "--quiet", "--filter", filter]),
    run("docker", ["network", "ls", "--quiet", "--filter", filter]),
    run("docker", ["volume", "ls", "--quiet", "--filter", filter]),
  ]);
  return results.reduce(
    (count, result) =>
      count + result.stdout.split("\n").filter((line) => line !== "").length,
    0,
  );
};

let failure;
try {
  const build = await requireRun("npm", ["run", "build:packages"]);
  process.stdout.write(build.stdout);
  await requireRun(
    "docker",
    composeArgs("up", "--detach", "--wait", "postgres"),
  );
  const migration = await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "migrate"),
  );
  process.stdout.write(`${migration.stdout}${migration.stderr}`);
  await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "validate"),
  );
  const portResult = await requireRun(
    "docker",
    composeArgs("port", "postgres", "5432"),
  );
  const port = /:(\d+)\s*$/.exec(portResult.stdout)?.[1];
  if (port === undefined) {
    throw new Error(
      `Could not resolve the PostgreSQL port: ${portResult.stdout}`,
    );
  }
  const test = await requireRun(
    "npm",
    ["test", "--workspace", "@petra/postgres"],
    {
      env: {
        PETRA_TEST_POSTGRES_URL: `postgresql://petra:petra-m12-integration-only@127.0.0.1:${port}/petra`,
        ...(process.env.PETRA_WAVE6_EVIDENCE_OUTPUT === undefined
          ? {}
          : {
              PETRA_WAVE6_EVIDENCE_OUTPUT: resolve(
                root,
                process.env.PETRA_WAVE6_EVIDENCE_OUTPUT,
              ),
            }),
      },
    },
  );
  process.stdout.write(test.stdout);
} catch (error) {
  failure = error;
  const logs = await run("docker", composeArgs("logs", "--tail=80"));
  process.stderr.write(`${logs.stdout}\n${logs.stderr}`);
} finally {
  const cleanup = await run(
    "docker",
    composeArgs("down", "--volumes", "--remove-orphans"),
  );
  if (cleanup.code !== 0 && failure === undefined) {
    failure = new Error(cleanup.stderr || cleanup.stdout);
  }
  const remaining = await resourceCount();
  if (remaining !== 0 && failure === undefined) {
    failure = new Error(
      `Disposable PostgreSQL cleanup left ${remaining} labeled resources.`,
    );
  }
}

if (failure !== undefined) throw failure;

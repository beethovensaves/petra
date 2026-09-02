import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "infra/artifacts/integration.compose.yaml");
const projectName = `petra-m12-s3-${process.pid}-${Date.now()}`;

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
      finish({ code: 1, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      finish({ code: code ?? 1, stdout, stderr });
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
  await requireRun(
    "docker",
    composeArgs("up", "--detach", "--wait", "artifacts"),
  );
  const portResult = await requireRun(
    "docker",
    composeArgs("port", "artifacts", "8333"),
  );
  const port = /:(\d+)\s*$/.exec(portResult.stdout)?.[1];
  if (port === undefined) {
    throw new Error(`Could not resolve the S3 port: ${portResult.stdout}`);
  }
  const test = await requireRun("npm", ["test", "--workspace", "@petra/s3"], {
    env: {
      PETRA_TEST_S3_ENDPOINT: `http://127.0.0.1:${port}`,
      PETRA_TEST_S3_ACCESS_KEY: "petra-m12-access",
      PETRA_TEST_S3_SECRET_KEY: "petra-m12-secret",
      PETRA_TEST_S3_BUCKET: "petra-m12-artifacts",
    },
  });
  process.stdout.write(test.stdout);
} catch (error) {
  failure = error;
  const logs = await run("docker", composeArgs("logs", "--tail=100"));
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
      `Disposable S3 cleanup left ${remaining} labeled resources.`,
    );
  }
}

if (failure !== undefined) throw failure;

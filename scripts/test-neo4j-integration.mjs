import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "infra/neo4j/integration.compose.yaml");
const projectName = `petra-m13-neo4j-${process.pid}-${Date.now()}`;

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

const servicePort = async (service, containerPort) => {
  const result = await requireRun(
    "docker",
    composeArgs("port", service, containerPort),
  );
  const port = /:(\d+)\s*$/.exec(result.stdout)?.[1];
  if (port === undefined) {
    throw new Error(
      `Could not resolve ${service}:${containerPort}: ${result.stdout}`,
    );
  }
  return port;
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
    composeArgs("up", "--detach", "--wait", "postgres", "neo4j"),
  );
  const migration = await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "migrate"),
  );
  process.stdout.write(migration.stdout);
  const postgresPort = await servicePort("postgres", "5432");
  const neo4jPort = await servicePort("neo4j", "7687");
  const test = await requireRun(
    "npm",
    ["test", "--workspace", "@petra/neo4j"],
    {
      env: {
        PETRA_TEST_POSTGRES_URL: `postgresql://petra:petra-integration-only@127.0.0.1:${postgresPort}/petra`,
        PETRA_TEST_NEO4J_URI: `bolt://127.0.0.1:${neo4jPort}`,
        PETRA_TEST_NEO4J_USER: "neo4j",
        PETRA_TEST_NEO4J_PASSWORD: "petra-integration-only",
      },
    },
  );
  process.stdout.write(test.stdout);
} catch (error) {
  failure = error;
  const logs = await run("docker", composeArgs("logs", "--tail=150"));
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
      `Disposable Neo4j cleanup left ${remaining} labeled resources.`,
    );
  }
}

if (failure !== undefined) throw failure;

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

const root = resolve(import.meta.dirname, "../..");
const composeFile = resolve(import.meta.dirname, "integration.compose.yaml");
const projectName = `petra-disc04-integration-${Date.now()}`;
const forceFailure = process.argv.includes("--force-test-failure");

const evidence = {
  projectName,
  forceFailure,
  startedAt: new Date().toISOString(),
};

function command(program, args, options = {}) {
  const started = performance.now();
  return new Promise((resolveCommand) => {
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
    child.on("close", (code, signal) => {
      resolveCommand({
        code: code ?? 1,
        signal,
        stdout,
        stderr,
        durationMs: Math.round(performance.now() - started),
      });
    });
  });
}

function composeArgs(...args) {
  return ["compose", "-p", projectName, "-f", composeFile, ...args];
}

async function requireCommand(program, args, options) {
  const result = await command(program, args, options);
  if (result.code !== 0) {
    throw new Error(
      `${program} failed (${result.code}): ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

async function publishedPort(service, containerPort) {
  const result = await requireCommand(
    "docker",
    composeArgs("port", service, String(containerPort)),
  );
  const match = /:(\d+)\s*$/.exec(result.stdout);
  if (!match)
    throw new Error(
      `Could not parse ${service}:${containerPort}: ${result.stdout}`,
    );
  return Number(match[1]);
}

async function labeledResources() {
  const filter = `label=com.docker.compose.project=${projectName}`;
  const [containers, networks, volumes] = await Promise.all([
    command("docker", ["ps", "--all", "--quiet", "--filter", filter]),
    command("docker", ["network", "ls", "--quiet", "--filter", filter]),
    command("docker", ["volume", "ls", "--quiet", "--filter", filter]),
  ]);
  return {
    containers: containers.stdout.trim().split("\n").filter(Boolean).length,
    networks: networks.stdout.trim().split("\n").filter(Boolean).length,
    volumes: volumes.stdout.trim().split("\n").filter(Boolean).length,
  };
}

async function main() {
  let failed = false;
  try {
    evidence.start = await requireCommand(
      "docker",
      composeArgs("up", "--detach", "--wait"),
    );
    const [postgresPort, neo4jHttpPort, neo4jBoltPort, s3Port] =
      await Promise.all([
        publishedPort("postgres", 5432),
        publishedPort("neo4j", 7474),
        publishedPort("neo4j", 7687),
        publishedPort("artifacts", 8333),
      ]);
    const testEnvironment = {
      PETRA_TEST_POSTGRES_URL: `postgresql://petra:petra-disc04-only@127.0.0.1:${postgresPort}/petra`,
      PETRA_TEST_NEO4J_HTTP_URL: `http://127.0.0.1:${neo4jHttpPort}`,
      PETRA_TEST_NEO4J_BOLT_URL: `bolt://127.0.0.1:${neo4jBoltPort}`,
      PETRA_TEST_S3_URL: `http://127.0.0.1:${s3Port}`,
      PETRA_DISC04_FORCE_FAILURE: forceFailure ? "1" : "0",
    };
    evidence.dynamicLoopbackPorts = {
      postgres: postgresPort,
      neo4jHttp: neo4jHttpPort,
      neo4jBolt: neo4jBoltPort,
      s3: s3Port,
    };
    const [vitest, pytest] = await Promise.all([
      command(
        "npm",
        [
          "exec",
          "vitest",
          "--",
          "run",
          "experiments/disc-04/integration/node.integration.test.mjs",
        ],
        { env: testEnvironment },
      ),
      command(
        "uv",
        [
          "run",
          "--project",
          "workers/science",
          "pytest",
          "experiments/disc-04/integration/test_services.py",
        ],
        { env: { ...testEnvironment, UV_CACHE_DIR: ".cache/uv" } },
      ),
    ]);
    evidence.tests = {
      vitest: {
        code: vitest.code,
        durationMs: vitest.durationMs,
        summary: `${vitest.stdout}\n${vitest.stderr}`.trim().slice(-1600),
      },
      pytest: {
        code: pytest.code,
        durationMs: pytest.durationMs,
        summary: `${pytest.stdout}\n${pytest.stderr}`.trim().slice(-1600),
      },
    };
    if (vitest.code !== 0 || pytest.code !== 0) {
      failed = true;
      const logs = await command("docker", composeArgs("logs", "--tail=40"));
      evidence.failureLogs = `${logs.stdout}\n${logs.stderr}`
        .trim()
        .slice(-5000);
    }
  } catch (error) {
    failed = true;
    evidence.error =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    const logs = await command("docker", composeArgs("logs", "--tail=40"));
    evidence.failureLogs = `${logs.stdout}\n${logs.stderr}`.trim().slice(-5000);
  } finally {
    evidence.cleanup = await command(
      "docker",
      composeArgs("down", "--volumes", "--remove-orphans"),
    );
    evidence.resourcesAfterCleanup = await labeledResources();
    evidence.completedAt = new Date().toISOString();
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  }
  process.exitCode = failed ? 1 : 0;
}

await main();

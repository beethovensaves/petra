import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { startPetraServer } from "./server.js";
import { createGroundedSynthesisPersistenceFromEnvironment } from "./grounded-synthesis-persistence.js";
import { createProjectShellPersistenceFromEnvironment } from "./project-shell-persistence.js";

export * from "./app.js";
export * from "./grounded-synthesis-persistence.js";
export * from "./m1-grounded-synthesis.js";
export * from "./project-shell-persistence.js";
export * from "./server.js";

const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  const applicationRoot = resolve(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  const publicDir =
    process.env.PETRA_PUBLIC_DIR ?? resolve(applicationRoot, "public");
  const workspaceRoot = resolve(applicationRoot, "../..");
  const codexEnabled = process.env.PETRA_CODEX_APP_SERVER_ENABLED === "true";
  const projectShellPersistence =
    process.env.PETRA_POSTGRES_USER?.trim() === undefined
      ? undefined
      : await createProjectShellPersistenceFromEnvironment();
  const port = Number(process.env.PORT ?? "4310");
  const codexOptions = codexEnabled
    ? {
        codexWorkspaceRoot: workspaceRoot,
        codexSidecar: { cwd: workspaceRoot },
        codexGroundedSynthesis: {},
        groundedSynthesisPersistence:
          await createGroundedSynthesisPersistenceFromEnvironment(),
      }
    : {};
  const server = await startPetraServer({
    port,
    publicDir,
    authToken: process.env.PETRA_AUTH_TOKEN ?? "petra-local-development",
    ...(projectShellPersistence === undefined
      ? {}
      : { projectShellPersistence }),
    ...codexOptions,
  });
  console.log(`Petra is listening at ${server.url}`);

  let stopping = false;
  const stop = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    console.log(`Petra received ${signal}; draining accepted work.`);
    try {
      await server.shutdown();
      process.exitCode = 0;
    } catch (error: unknown) {
      console.error(error);
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
}

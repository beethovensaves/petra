import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inventory = JSON.parse(
  readFileSync(resolve(root, "scripts/ui-operation-inventory.json"), "utf8"),
);
const wave6BackendBaseline = JSON.parse(
  readFileSync(
    resolve(root, "scripts/wave6-operation-contract-baseline.json"),
    "utf8",
  ),
);
const args = new Set(process.argv.slice(2));
const waveArgument = process.argv.indexOf("--require-wave");
const requiredWave =
  waveArgument === -1
    ? undefined
    : Number.parseInt(process.argv[waveArgument + 1] ?? "", 10);

assert.equal(inventory.schema_name, "petra.ui-operation-inventory");
assert.equal(inventory.schema_version, 2);
assert.ok(
  Array.isArray(inventory.operations) && inventory.operations.length > 0,
);

assert.equal(
  wave6BackendBaseline.schema_name,
  "petra.wave6-operation-contract-baseline",
);
assert.equal(wave6BackendBaseline.schema_version, 1);
assert.match(wave6BackendBaseline.baseline_commit, /^[0-9a-f]{40}$/u);
assert.ok(
  wave6BackendBaseline.owners !== null &&
    typeof wave6BackendBaseline.owners === "object" &&
    !Array.isArray(wave6BackendBaseline.owners),
);
assert.ok(Array.isArray(wave6BackendBaseline.operations));

const allowedStates = new Set([
  "live",
  "partial",
  "presentation_only",
  "unavailable",
  "missing",
]);
const allowedInteractions = new Set([
  "query",
  "navigation",
  "command",
  "local_command",
]);
const ids = new Set();
for (const operation of inventory.operations) {
  assert.match(operation.id, /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u);
  assert.ok(!ids.has(operation.id), `Duplicate operation ${operation.id}.`);
  ids.add(operation.id);
  assert.ok(typeof operation.label === "string" && operation.label.length > 0);
  assert.ok([6, 7, 8].includes(operation.milestone));
  assert.ok(
    allowedStates.has(operation.current_state),
    `${operation.id} has invalid state ${operation.current_state}.`,
  );
  assert.ok(
    allowedInteractions.has(operation.interaction),
    `${operation.id} has invalid interaction ${operation.interaction}.`,
  );
  for (const field of ["surfaces", "flows", "requests"]) {
    assert.ok(
      Array.isArray(operation[field]) && operation[field].length > 0,
      `${operation.id} must name ${field}.`,
    );
  }
  assert.ok(Array.isArray(operation.paths));
  for (const identifier of operation.surfaces) {
    assert.match(identifier, /^SP(?:0[1-9]|1[0-4])$/u);
  }
  for (const identifier of operation.flows) {
    assert.match(identifier, /^UX-FLOW-(?:0[1-9]|1[0-8])$/u);
  }
  for (const identifier of operation.requests) {
    assert.match(identifier, /^UX-REQ-(?:00[1-9]|01[0-9]|02[0-3])$/u);
  }
  for (const identifier of operation.paths) {
    assert.match(identifier, /^UX-PATH-0[1-4]$/u);
  }
  assert.ok(typeof operation.route === "string" && operation.route.length > 0);
  assert.ok(
    typeof operation.control === "string" && operation.control.length > 0,
  );
  assert.equal(typeof operation.runtime_owner, "string");
  assert.ok(Array.isArray(operation.evidence));
  for (const evidence of operation.evidence) {
    assert.ok(
      evidence !== null && typeof evidence === "object",
      `${operation.id} evidence must be an object.`,
    );
    for (const field of ["command", "artifact", "boundary"]) {
      assert.ok(
        typeof evidence[field] === "string" && evidence[field].length > 0,
        `${operation.id} evidence must name ${field}.`,
      );
    }
  }
}

const wave6Operations = inventory.operations.filter(
  (operation) => operation.milestone === 6,
);
const wave6OperationIds = new Set(
  wave6Operations.map((operation) => operation.id),
);
const baselineOperationIds = new Set();
const allowedOwnerStatuses = new Set([
  "owned",
  "partial",
  "missing",
  "client_owned",
]);
const allowedOwnerKinds = new Set([
  "query",
  "command",
  "partial",
  "missing",
  "client",
]);

assert.equal(
  wave6BackendBaseline.operations.length,
  wave6Operations.length,
  "The Wave 6 backend baseline must reconcile every milestone-6 operation exactly once.",
);
assert.deepEqual(
  new Set(wave6Operations.flatMap((operation) => operation.requests)),
  new Set([
    ...Array.from(
      { length: 16 },
      (_, index) => `UX-REQ-${String(index + 1).padStart(3, "0")}`,
    ),
    ...Array.from(
      { length: 4 },
      (_, index) => `UX-REQ-${String(index + 20).padStart(3, "0")}`,
    ),
  ]),
  "The Wave 6 operation baseline must retain UX-REQ-001–016 and UX-REQ-020–023.",
);

for (const [ownerId, owner] of Object.entries(wave6BackendBaseline.owners)) {
  assert.match(ownerId, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u);
  assert.ok(owner !== null && typeof owner === "object");
  assert.ok(
    allowedOwnerKinds.has(owner.kind),
    `${ownerId} has invalid owner kind ${owner.kind}.`,
  );
  for (const field of [
    "production_owner",
    "authorization",
    "persistence",
    "recovery",
  ]) {
    assert.equal(
      typeof owner[field],
      "string",
      `${ownerId} must describe ${field}.`,
    );
    if (field !== "production_owner" || owner.kind !== "missing") {
      assert.ok(owner[field].length > 0, `${ownerId} must describe ${field}.`);
    }
  }
  assert.equal(
    owner.kind === "missing",
    owner.production_owner.length === 0,
    `${ownerId} must leave production_owner empty exactly when the owner is missing.`,
  );
}

for (const operation of wave6BackendBaseline.operations) {
  assert.ok(
    wave6OperationIds.has(operation.operation_id),
    `Unknown Wave 6 operation ${operation.operation_id}.`,
  );
  assert.ok(
    !baselineOperationIds.has(operation.operation_id),
    `Duplicate Wave 6 baseline operation ${operation.operation_id}.`,
  );
  baselineOperationIds.add(operation.operation_id);
  assert.ok(
    allowedOwnerStatuses.has(operation.owner_status),
    `${operation.operation_id} has invalid owner status ${operation.owner_status}.`,
  );
  const owner = wave6BackendBaseline.owners[operation.owner];
  assert.ok(
    owner !== undefined,
    `${operation.operation_id} has unknown owner.`,
  );
  assert.equal(typeof operation.missing_owner, "string");
  assert.equal(
    ["partial", "missing"].includes(operation.owner_status),
    operation.missing_owner.length > 0,
    `${operation.operation_id} must name a missing owner exactly when its baseline is partial or missing.`,
  );
  const expectedKinds = {
    owned: new Set(["query", "command"]),
    partial: new Set(["query", "command", "partial"]),
    missing: new Set(["missing"]),
    client_owned: new Set(["client"]),
  };
  assert.ok(
    expectedKinds[operation.owner_status].has(owner.kind),
    `${operation.operation_id} owner status does not match ${operation.owner}.`,
  );
}

assert.deepEqual(
  baselineOperationIds,
  wave6OperationIds,
  "The Wave 6 backend baseline must not omit an operation.",
);

const referenced = (field) =>
  new Set(inventory.operations.flatMap((operation) => operation[field]));
const missingIds = (expected, actual) =>
  expected.filter((identifier) => !actual.has(identifier));
const sequence = (prefix, count, width = 2) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix}${String(index + 1).padStart(width, "0")}`,
  );

assert.deepEqual(
  missingIds(sequence("SP", 14), referenced("surfaces")),
  [],
  "The operation inventory omits a DB18 surface.",
);
assert.deepEqual(
  missingIds(sequence("UX-FLOW-", 18), referenced("flows")),
  [],
  "The operation inventory omits an accepted flow.",
);
assert.deepEqual(
  missingIds(sequence("UX-REQ-", 23, 3), referenced("requests")),
  [],
  "The operation inventory omits a runtime request boundary.",
);
assert.deepEqual(
  missingIds(sequence("UX-PATH-", 4), referenced("paths")),
  [],
  "The operation inventory omits an accepted end-to-end path.",
);

const counts = Object.fromEntries(
  [...allowedStates].map((state) => [
    state,
    inventory.operations.filter(
      (operation) => operation.current_state === state,
    ).length,
  ]),
);

if (args.has("--require-wave")) {
  assert.ok(
    [6, 7, 8].includes(requiredWave),
    "--require-wave must be 6, 7, or 8.",
  );
  const incomplete = inventory.operations.filter(
    (operation) =>
      operation.milestone <= requiredWave &&
      (operation.current_state !== "live" ||
        operation.runtime_owner.length === 0 ||
        operation.evidence.length === 0),
  );
  if (incomplete.length > 0) {
    const problems = (operation) => [
      ...(operation.current_state === "live"
        ? []
        : [`state=${operation.current_state}`]),
      ...(operation.runtime_owner.length > 0 ? [] : ["runtime owner missing"]),
      ...(operation.evidence.length > 0 ? [] : ["executed evidence missing"]),
    ];
    process.stderr.write(
      `Wave ${requiredWave} user-operation gate failed (${incomplete.length} incomplete):\n${incomplete
        .map(
          (operation) =>
            `- ${operation.id}: ${problems(operation).join("; ")}; ${operation.label}`,
        )
        .join("\n")}\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Wave ${requiredWave} user-operation gate passed for every operation due by this milestone.\n`,
    );
  }
} else {
  const ownerCounts = Object.fromEntries(
    [...allowedOwnerStatuses].map((status) => [
      status,
      wave6BackendBaseline.operations.filter(
        (operation) => operation.owner_status === status,
      ).length,
    ]),
  );
  process.stdout.write(
    `UI operation inventory valid: ${inventory.operations.length} operations; ${JSON.stringify(counts)}; Wave 6 backend baseline ${JSON.stringify(ownerCounts)}.\n`,
  );
}

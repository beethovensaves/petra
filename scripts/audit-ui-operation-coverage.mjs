import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inventory = JSON.parse(
  readFileSync(resolve(root, "scripts/ui-operation-inventory.json"), "utf8"),
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
  process.stdout.write(
    `UI operation inventory valid: ${inventory.operations.length} operations; ${JSON.stringify(counts)}.\n`,
  );
}

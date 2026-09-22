import { readFileSync } from "node:fs";

const inventory = JSON.parse(
  readFileSync(
    new URL("./ui-operation-inventory.json", import.meta.url),
    "utf8",
  ),
);
const presentationMap = JSON.parse(
  readFileSync(
    new URL("./ui-operation-presentation-map.json", import.meta.url),
    "utf8",
  ),
);

const allowedEntries = new Set([
  "agent",
  "workspace",
  "system",
  "settings",
  "test_harness",
]);
const allowedResults = new Set(["agent", "workspace", "inspector", "none"]);
const allowedExposures = new Set([
  "primary",
  "contextual",
  "on_demand",
  "automatic",
  "secondary",
  "internal",
]);
const fail = (message) => {
  throw new Error(message);
};

if (presentationMap.schema_name !== "petra.ui-operation-presentation-map") {
  fail("Unexpected presentation-map schema.");
}
if (
  presentationMap.layout?.desktop_agent !== 30 ||
  presentationMap.layout?.desktop_workspace !== 70
) {
  fail("The desktop presentation map must preserve the accepted 30/70 split.");
}

const inventoryById = new Map(
  inventory.operations.map((operation) => [operation.id, operation]),
);
const mappingsById = new Map();
for (const mapping of presentationMap.operations ?? []) {
  if (mappingsById.has(mapping.id)) fail(`Duplicate mapping: ${mapping.id}`);
  mappingsById.set(mapping.id, mapping);
  const operation = inventoryById.get(mapping.id);
  if (!operation) fail(`Unknown mapped operation: ${mapping.id}`);
  if (
    mapping.milestone !== operation.milestone ||
    mapping.label !== operation.label
  ) {
    fail(`Stale inventory identity in mapping: ${mapping.id}`);
  }
  if (!allowedEntries.has(mapping.entry)) {
    fail(`Invalid entry for ${mapping.id}: ${mapping.entry}`);
  }
  if (!allowedResults.has(mapping.result)) {
    fail(`Invalid result for ${mapping.id}: ${mapping.result}`);
  }
  if (!allowedExposures.has(mapping.exposure)) {
    fail(`Invalid exposure for ${mapping.id}: ${mapping.exposure}`);
  }
  if (
    typeof mapping.presentation !== "string" ||
    !mapping.presentation.trim()
  ) {
    fail(`Missing presentation rule for ${mapping.id}`);
  }
}

const missing = [...inventoryById.keys()].filter(
  (operationId) => !mappingsById.has(operationId),
);
if (missing.length > 0) {
  fail(`Unmapped operations: ${missing.join(", ")}`);
}

const primary = presentationMap.operations.filter(
  (mapping) => mapping.exposure === "primary",
);
if (primary.length > 8) {
  fail(
    `The adaptation exposes ${primary.length} primary operations; the accepted calm shell allows at most eight.`,
  );
}

for (const operationId of ["application.guide", "application.reset"]) {
  const mapping = mappingsById.get(operationId);
  if (
    mapping?.entry !== "test_harness" ||
    mapping?.exposure !== "internal" ||
    mapping?.result !== "none"
  ) {
    fail(`${operationId} must remain outside the customer-facing product.`);
  }
}

for (const operationId of ["taxonomy.bind-project", "model.use"]) {
  const mapping = mappingsById.get(operationId);
  if (mapping?.entry !== "system" || mapping?.exposure !== "automatic") {
    fail(`${operationId} must not become a routine visible control.`);
  }
}

console.log(
  `Frontend operation presentation map passes: ${mappingsById.size}/${inventoryById.size} operations mapped; ${primary.length} primary operations.`,
);

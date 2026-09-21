import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const artifactPath = resolve(
  root,
  "reports/WAVE6-OPERATION-CONTROL-AUDIT.json",
);
const target = {
  design_commit: "19c5ab8ccbe0986c0fa21b6567dcba00611a473a",
  counterpart_commit: "da6a24150180be6c020c1139149591e134e02f5d",
};
const readTargetJson = (commit, path) =>
  JSON.parse(
    execFileSync("git", ["show", `${commit}:${path}`], {
      cwd: root,
      encoding: "utf8",
    }),
  );
const inventory = readTargetJson(
  target.design_commit,
  "scripts/ui-operation-inventory.json",
);
const baseline = readTargetJson(
  target.counterpart_commit,
  "scripts/wave6-operation-contract-baseline.json",
);

const sourceSurface = (id) => {
  const family = id.split(".")[0];
  const sources = {
    application: ["apps/workbench/src/product/CheckpointGuide.tsx"],
    brief: [
      "apps/workbench/src/product/ReferenceWorkbench.tsx",
      "apps/workbench/src/product/ProjectBriefSurface.tsx",
      "apps/workbench/src/product/SuggestedAction.tsx",
    ],
    details: [
      "apps/workbench/src/product/FocusedGraphDetails.tsx",
      "apps/workbench/src/product/ReferenceWorkbench.tsx",
    ],
    feedback: [
      "apps/workbench/src/product/ReferenceWorkbench.tsx",
      "apps/workbench/src/product/ReviewSurface.tsx",
      "apps/workbench/src/product/WorkPetraSurface.tsx",
    ],
    graph: [
      "apps/workbench/src/product/GraphSurface.tsx",
      "apps/workbench/src/product/FocusedGraphExploration.tsx",
      "apps/workbench/src/product/FocusedGraphDetails.tsx",
    ],
    history: ["apps/workbench/src/product/RemainingSurfaces.tsx"],
    model: [
      "apps/workbench/src/product/WorkPetraSurface.tsx",
      "apps/workbench/src/product/PetraModelInteraction.tsx",
    ],
    petra: [
      "apps/workbench/src/product/WorkPetraSurface.tsx",
      "apps/workbench/src/product/PetraModelInteraction.tsx",
    ],
    project: ["apps/workbench/src/product/ReferenceWorkbench.tsx"],
    review: [
      "apps/workbench/src/product/ReviewSurface.tsx",
      "apps/workbench/src/product/ReviewApply.tsx",
    ],
    settings: ["apps/workbench/src/product/RemainingSurfaces.tsx"],
    shell: ["apps/workbench/src/product/ReferenceWorkbench.tsx"],
    source: ["apps/workbench/src/product/ReferenceWorkbench.tsx"],
    taxonomy: ["apps/workbench/src/product/ProjectProfileSurface.tsx"],
    work: ["apps/workbench/src/product/WorkPetraSurface.tsx"],
  };
  return sources[family] ?? [];
};

const returnRequirement = (id) => {
  if (id === "application.reset") {
    return "Open the replacement Project Brief and retain a discoverable return to the stable test guide.";
  }
  const family = id.split(".")[0];
  const requirements = {
    application:
      "Keep the stable guide URL and selected representative Project while each task opens and returns.",
    brief:
      "Return to the originating Brief item and focus with the same Project and task context.",
    details:
      "Return to the exact selected object, relationship, source, and originating task focus.",
    feedback:
      "Return focus to the control or task region that produced the feedback without losing input.",
    graph:
      "Return to the exact graph question, layer, selection, textual peer, and originating task.",
    history:
      "Return from the exact episode or recovery result to the updated Brief with the same Project context.",
    model:
      "Remain in the exact Petra thread and composer context, preserving draft and run identity on failure.",
    petra:
      "Return to the exact Petra thread or originating task with Project, Work, Review, and draft context retained.",
    project:
      "Keep the selected Project identity and either remain on Projects with an exact outcome or open its retained task and focus.",
    review:
      "Return to the exact Review session and member, then to its originating task, with decision and Apply outcomes retained.",
    settings:
      "Return to the same Project task or Settings control with the selected personal state retained.",
    shell:
      "Preserve the Project, originating task, semantic selection, and keyboard focus across shell navigation.",
    source:
      "Return to the exact ProjectSource or source list selection and then to the originating task without losing context.",
    taxonomy:
      "Return to Projects, Settings, or the originating Project surface with the exact registered profile binding retained.",
    work: "Return to the exact WorkUnit, stage or required input, and originating task with run identity and entered input retained.",
  };
  return requirements[family];
};

const outcomeRequirement = (operation) => {
  const common = `Render the material result of “${operation.label}” without client-invented authority.`;
  if (operation.interaction === "command") {
    return `${common} Show pending, exact canonical receipt/effect, partial or unknown effect, failure, and eligible idempotent recovery.`;
  }
  if (operation.interaction === "local_command") {
    return `${common} Show the exact local change or reset, retained context, and a safe recoverable failure state.`;
  }
  if (operation.interaction === "navigation") {
    return `${common} Show the exact destination or honest unavailability while preserving task context.`;
  }
  return `${common} Show exact, empty, partial or stale, unavailable, failed, and recoverable read states where the contract permits them.`;
};

const visibleStatus = (state) => {
  const statuses = {
    live: "declared_production_control",
    partial: "declared_partial_control",
    presentation_only: "presentation_only_control",
    unavailable: "declared_unavailable_control",
    missing: "missing_control",
  };
  return statuses[state];
};

const outcomeStatus = (state) => {
  const statuses = {
    live: "declared_but_unexecuted",
    partial: "incomplete_and_unexecuted",
    presentation_only: "presentation_only_and_unexecuted",
    unavailable: "unavailable_and_unexecuted",
    missing: "missing_and_unexecuted",
  };
  return statuses[state];
};

const dispositionFor = (operation, owner) => {
  const actions = [];
  if (owner.owner_status === "missing") {
    actions.push("backend_owner_required");
  } else if (owner.owner_status === "partial") {
    actions.push("backend_contract_completion_required");
  }
  if (operation.runtime_owner.length === 0) {
    actions.push("bind_inventory_runtime_owner");
  }
  if (operation.current_state === "missing") {
    actions.push("add_visible_control");
  } else if (operation.current_state === "unavailable") {
    actions.push("enable_registered_control");
  } else if (operation.current_state === "presentation_only") {
    actions.push("complete_client_owned_product_behavior");
  } else if (operation.current_state === "partial") {
    actions.push("complete_control_outcomes_recovery_and_return");
  }
  actions.push("execute_material_outcomes_and_exact_return");
  actions.push("attach_named_executed_evidence");
  return actions;
};

const countBy = (values) =>
  Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((value) => [value, values.filter((item) => item === value).length]),
  );

const buildArtifact = () => {
  assert.equal(inventory.schema_name, "petra.ui-operation-inventory");
  assert.equal(baseline.schema_name, "petra.wave6-operation-contract-baseline");

  const wave6 = inventory.operations.filter(
    (operation) => operation.milestone === 6,
  );
  const ownerByOperation = new Map(
    baseline.operations.map((operation) => [operation.operation_id, operation]),
  );
  const ids = new Set();
  const operations = wave6.map((operation) => {
    assert.ok(!ids.has(operation.id), `Duplicate operation ${operation.id}.`);
    ids.add(operation.id);
    const owner = ownerByOperation.get(operation.id);
    assert.ok(owner, `Missing backend baseline row for ${operation.id}.`);
    const ownerDefinition = baseline.owners[owner.owner];
    assert.ok(ownerDefinition, `Missing owner ${owner.owner}.`);
    return {
      operation_id: operation.id,
      label: operation.label,
      inventory_state: operation.current_state,
      visible_control: {
        route: operation.route,
        label: operation.control,
        interaction: operation.interaction,
        audit_status: visibleStatus(operation.current_state),
        inspected_sources: sourceSurface(operation.id),
      },
      production_owner: {
        baseline_status: owner.owner_status,
        owner_id: owner.owner,
        boundary: ownerDefinition.production_owner,
        inventory_runtime_owner: operation.runtime_owner,
        inventory_binding_status:
          operation.runtime_owner.length > 0
            ? "present"
            : "missing_from_operation_ledger",
        missing_owner: owner.missing_owner,
      },
      material_outcomes: {
        audit_status: outcomeStatus(operation.current_state),
        required_boundary: outcomeRequirement(operation),
      },
      exact_return: {
        audit_status:
          operation.current_state === "live"
            ? "declared_but_unexecuted"
            : "incomplete_and_unexecuted",
        required_boundary: returnRequirement(operation.id),
      },
      executed_evidence: operation.evidence,
      design_disposition: dispositionFor(operation, owner),
    };
  });

  assert.equal(operations.length, 97);
  assert.equal(ownerByOperation.size, 97);
  assert.ok(
    operations.every((operation) => operation.executed_evidence.length === 0),
    "This audit target unexpectedly contains executed operation evidence.",
  );

  return {
    schema_name: "petra.wave6-operation-control-audit",
    schema_version: 1,
    evidence_id: "WAVE6-OPERATION-CONTROL",
    scenario_id: "complete-ui-operation-audit",
    status: "passed_with_findings",
    audited_on: "2026-09-19",
    target,
    command: "npm run audit:wave6:operation-control",
    sources: [
      "scripts/ui-operation-inventory.json",
      "scripts/wave6-operation-contract-baseline.json",
      "apps/workbench/src/router.tsx",
      "apps/workbench/src/product",
    ],
    boundary:
      "Static source and ledger reconciliation of all 97 Wave 6 operations at the pinned design/counterpart commits. It verifies audit completeness and records missing controls, owners, outcomes, exact returns, and evidence; it does not execute or satisfy any product-path scenario.",
    summary: {
      operations: operations.length,
      inventory_states: countBy(
        operations.map((operation) => operation.inventory_state),
      ),
      backend_owner_states: countBy(
        operations.map(
          (operation) => operation.production_owner.baseline_status,
        ),
      ),
      runtime_owner_bindings_missing: operations.filter(
        (operation) =>
          operation.production_owner.inventory_binding_status ===
          "missing_from_operation_ledger",
      ).length,
      operations_without_executed_evidence: operations.filter(
        (operation) => operation.executed_evidence.length === 0,
      ).length,
      non_live_operations: operations.filter(
        (operation) => operation.inventory_state !== "live",
      ).length,
    },
    findings: [
      "All 97 Wave 6 operations lack attached executed evidence, so no operation is closure-ready even where the ledger says live.",
      "Fifty-four operations are not live: partial, presentation-only, unavailable, or missing controls still require remediation before their named scenarios can run.",
      "Seventy-one operation rows omit the inventory runtime-owner binding required by the milestone gate; the backend baseline supplies contract context but does not satisfy that ledger field.",
      "Nine baseline operations have no production owner and fourteen have only a partial owner; design must not invent those commands or authority.",
      "application.guide now names a production React route in the inventory while the older backend baseline still classifies its design owner as missing; later reconciliation must preserve the implemented guide and update the authoritative ledger without rewriting backend authority in this design audit.",
      "Resume and Start again remain honestly unavailable, personal settings remain presentation-only, and the guided source, Review, action, Graph, History, recovery, model, and Work scenarios remain unexecuted.",
    ],
    operations,
  };
};

const expected = buildArtifact();

if (process.argv.includes("--write")) {
  writeFileSync(artifactPath, `${JSON.stringify(expected, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${artifactPath}.\n`);
} else {
  const retained = JSON.parse(readFileSync(artifactPath, "utf8"));
  assert.deepEqual(
    retained,
    expected,
    "The retained Wave 6 operation-control audit is stale.",
  );
  process.stdout.write(
    `Wave 6 operation-control audit passed with findings: ${expected.summary.operations} operations reconciled; ${expected.summary.non_live_operations} non-live; ${expected.summary.runtime_owner_bindings_missing} runtime-owner bindings missing; ${expected.summary.operations_without_executed_evidence} without executed evidence.\n`,
  );
}

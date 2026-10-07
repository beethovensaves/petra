import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const scriptPath = fileURLToPath(import.meta.url);
export const repositoryRoot = resolve(dirname(scriptPath), "..");
const inventoryPath = "scripts/frontend-a1-work-inventory.json";
const reportPath = "reports/FE-A1-CONTRACT-IMPLEMENTATION-LEDGER.md";
const stageMinimums = [5, 7, 7, 18, 23, 9, 7, 13];
const requiredIds = stageMinimums.flatMap((count, stage) =>
  Array.from(
    { length: count },
    (_, index) => `FE-A1.${stage}-W${String(index + 1).padStart(2, "0")}`,
  ),
);
const states = new Set(["planned", "in_progress", "blocked", "complete"]);
const nonempty = (value) =>
  typeof value === "string" && value.trim().length > 0;
const numbered = (prefix, count, width) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix}${String(index + 1).padStart(width, "0")}`,
  );

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function uniqueIds(records, key) {
  requireCondition(Array.isArray(records), `${key} records must be an array.`);
  const ids = records.map((record) => record[key]);
  requireCondition(ids.every(nonempty), `Missing ${key}.`);
  requireCondition(new Set(ids).size === ids.length, `Duplicate ${key}.`);
  return new Set(ids);
}

function checkEvidence(records, root, label) {
  requireCondition(
    Array.isArray(records) && records.length > 0,
    `${label} has no completion evidence.`,
  );
  for (const record of records) {
    requireCondition(
      nonempty(record.artifact) &&
        nonempty(record.command) &&
        nonempty(record.boundary),
      `${label} evidence needs artifact, command, and coverage boundary.`,
    );
    requireCondition(
      !record.artifact.startsWith("/") &&
        !record.artifact.split("/").includes("..") &&
        existsSync(resolve(root, record.artifact)),
      `${label} evidence artifact is missing or outside the repository: ${record.artifact}`,
    );
  }
}

export function validateA1Inventory(
  data,
  operations,
  { root = repositoryRoot, checkArtifacts = true } = {},
) {
  requireCondition(
    data.schema_name === "petra.frontend-a1-work-inventory" &&
      data.schema_version === "1.0.0",
    "Unknown A1 ledger schema.",
  );
  requireCondition(
    data.controlling_decision === "D024",
    "A1 must retain D024.",
  );
  requireCondition(states.has(data.status), "Invalid A1 status.");
  const ids = uniqueIds(data.work_items, "id");
  const milestones = uniqueIds(data.milestones, "id");
  requireCondition(
    milestones.size === 8 &&
      [...Array(8)].every((_, stage) => milestones.has(`FE-A1.${stage}`)),
    "All eight A1 milestones are mandatory.",
  );
  for (const id of requiredIds)
    requireCondition(ids.has(id), `Required A1 work removed: ${id}`);
  const byId = new Map(data.work_items.map((item) => [item.id, item]));
  const scenarioIds = uniqueIds(data.optional_scenarios, "id");
  for (const item of data.work_items) {
    requireCondition(
      milestones.has(item.milestone) &&
        item.id.startsWith(`${item.milestone}-W`),
      `${item.id} has an invalid milestone.`,
    );
    requireCondition(
      states.has(item.status),
      `${item.id} cannot be skipped, deferred, or superseded.`,
    );
    requireCondition(
      data.owner_roles.includes(item.owner),
      `${item.id} has no accountable role.`,
    );
    requireCondition(
      nonempty(item.title) &&
        nonempty(item.implementation) &&
        item.acceptance?.length >= 2 &&
        item.acceptance.every(nonempty),
      `${item.id} needs a deliverable and observable criteria.`,
    );
    requireCondition(
      item.contracts?.length > 0,
      `${item.id} has no contract coverage.`,
    );
    requireCondition(
      Array.isArray(item.optional_scenarios) &&
        item.optional_scenarios.every((id) => scenarioIds.has(id)),
      `${item.id} has an unknown optional check reference.`,
    );
    requireCondition(
      Array.isArray(item.depends_on),
      `${item.id} needs explicit prerequisites.`,
    );
    for (const dependency of item.depends_on) {
      requireCondition(
        ids.has(dependency) && dependency !== item.id,
        `${item.id} has an unknown/self prerequisite: ${dependency}`,
      );
      if (item.status === "complete")
        requireCondition(
          byId.get(dependency).status === "complete",
          `${item.id} completed before ${dependency}.`,
        );
    }
    if (item.status === "blocked")
      requireCondition(
        nonempty(item.blocker),
        `${item.id} needs a named blocker.`,
      );
    if (item.status === "complete" && checkArtifacts)
      checkEvidence(item.completion_evidence, root, item.id);
    if (checkArtifacts)
      for (const artifact of item.retained_evidence)
        requireCondition(
          existsSync(resolve(root, artifact)),
          `${item.id} retained artifact missing: ${artifact}`,
        );
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    requireCondition(!visiting.has(id), `A1 dependency cycle at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    byId.get(id).depends_on.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  [...ids].forEach(visit);
  for (const scenario of data.optional_scenarios) {
    requireCondition(
      scenario.required === false && scenario.phase === "FE-A1.7",
      `${scenario.id} must remain optional and near the end of A1.`,
    );
    requireCondition(
      ["not_run", "in_progress", "complete", "not_selected"].includes(
        scenario.status,
      ) &&
        nonempty(scenario.title) &&
        nonempty(scenario.task),
      `${scenario.id} has invalid optional state or description.`,
    );
    if (scenario.status === "complete" && checkArtifacts)
      checkEvidence(scenario.completion_evidence, root, scenario.id);
  }
  const mapped = uniqueIds(data.operation_coverage, "operation");
  const expected = new Map(
    operations.map((operation) => [operation.id, operation]),
  );
  requireCondition(
    mapped.size === expected.size &&
      [...mapped].every((id) => expected.has(id)),
    "A1 operation assignments must exactly match the frozen inventory.",
  );
  for (const row of data.operation_coverage) {
    const operation = expected.get(row.operation);
    if (operation.milestone === 6)
      requireCondition(
        row.release === "FE-A1" && ids.has(row.work_item),
        `${row.operation} cannot leave A1.`,
      );
    else
      requireCondition(
        row.release === `Wave ${operation.milestone}` &&
          row.work_item === null &&
          ids.has(row.a1_boundary),
        `${row.operation} needs its explicit later-wave boundary.`,
      );
  }
  const requests = uniqueIds(data.request_coverage, "request");
  requireCondition(
    requests.size === 23 &&
      numbered("UX-REQ-", 23, 3).every((id) => requests.has(id)),
    "All 23 accepted UX requests need A1 dispositions.",
  );
  for (const row of data.request_coverage)
    requireCondition(
      nonempty(row.scope) &&
        row.work_items?.length &&
        row.work_items.every((id) => ids.has(id)),
      `${row.request} has an orphan disposition.`,
    );
  const flows = uniqueIds(data.flow_coverage, "flow");
  requireCondition(
    flows.size === 18 &&
      numbered("UX-FLOW-", 18, 2).every((id) => flows.has(id)),
    "All 18 flow families need A1 dispositions.",
  );
  for (const row of data.flow_coverage)
    requireCondition(
      nonempty(row.scope) &&
        row.milestones?.length &&
        row.milestones.every((id) => milestones.has(id)),
      `${row.flow} has an orphan disposition.`,
    );
  return data;
}

export function candidateFingerprint(
  data,
  root = repositoryRoot,
  revision = "HEAD",
) {
  const paths = ["apps", "packages", "workers", "schemas", "infra", "scripts"];
  const result = spawnSync("git", ["ls-tree", "-r", revision, "--", ...paths], {
    cwd: root,
    encoding: "utf8",
  });
  requireCondition(
    result.status === 0,
    "Cannot bind A1 acceptance to the implementation tree.",
  );
  const tree = result.stdout
    .split("\n")
    .filter((line) => !line.endsWith(`\t${inventoryPath}`))
    .join("\n");
  const scope = {
    work: data.work_items.map(
      ({
        id,
        milestone,
        title,
        owner,
        implementation,
        acceptance,
        depends_on,
        contracts,
      }) => ({
        id,
        milestone,
        title,
        owner,
        implementation,
        acceptance,
        depends_on,
        contracts,
      }),
    ),
    operations: data.operation_coverage,
    requests: data.request_coverage,
    flows: data.flow_coverage,
  };
  return createHash("sha256")
    .update(tree)
    .update(JSON.stringify(scope))
    .digest("hex");
}

export function a1CompletionProblems(
  data,
  {
    root = repositoryRoot,
    fingerprint = () =>
      candidateFingerprint(
        data,
        root,
        data.user_acceptance?.candidate_commit ?? "HEAD",
      ),
  } = {},
) {
  const problems = [];
  const open = data.work_items.filter((item) => item.status !== "complete");
  if (data.status !== "complete")
    problems.push(`milestone status is ${data.status}`);
  if (open.length)
    problems.push(
      `${open.length} mandatory work items incomplete (first: ${open[0].id})`,
    );
  const acceptance = data.user_acceptance;
  if (
    !acceptance ||
    acceptance.actor !== "user" ||
    acceptance.decision !== "accepted"
  )
    problems.push("explicit user acceptance is missing");
  else {
    if (
      !/^[a-f0-9]{40}$/.test(acceptance.candidate_commit ?? "") ||
      !nonempty(acceptance.accepted_at) ||
      !nonempty(acceptance.user_statement)
    )
      problems.push(
        "user acceptance lacks candidate, date, or explicit statement",
      );
    if (acceptance.candidate_fingerprint !== fingerprint())
      problems.push(
        "user acceptance belongs to a different implementation or contract",
      );
    if (
      !nonempty(acceptance.artifact) ||
      !existsSync(resolve(root, acceptance.artifact))
    )
      problems.push("user acceptance record is missing");
  }
  return problems;
}

export function assertFrontendA1Complete(root = repositoryRoot) {
  const data = JSON.parse(readFileSync(resolve(root, inventoryPath), "utf8"));
  const operations = JSON.parse(
    readFileSync(resolve(root, "scripts/ui-operation-inventory.json"), "utf8"),
  ).operations;
  validateA1Inventory(data, operations, { root });
  const problems = a1CompletionProblems(data, { root });
  if (problems.length)
    throw new Error(
      `FE-A1 blocks later waves: ${problems.join("; ")}. See ${reportPath}.`,
    );
  const result = spawnSync(
    "git",
    [
      "merge-base",
      "--is-ancestor",
      data.user_acceptance.candidate_commit,
      "HEAD",
    ],
    { cwd: root, encoding: "utf8" },
  );
  requireCondition(
    result.status === 0,
    "The accepted A1 candidate is not in this delivery branch; integrate it before later waves.",
  );
}

const link = (path) => `[${path}](../${path})`;
const itemRef = (id) => `[${id}](#${id.toLowerCase().replaceAll(".", "")})`;

export async function renderA1Ledger(data) {
  const lines = [
    "# FE-A1 contractual implementation ledger",
    "",
    `Updated: ${data.updated}. Status: \`${data.status}\`. **Wave 7 and Wave 8 remain blocked.**`,
    "",
    "This is the required execution breakdown for FE-A1. It records implementation obligations, not a promise that the current product meets them. The user rejected the inspected candidate on 2026-10-07. Its retained command, layout, and persistence evidence remains useful; the requested frontend and connected work cycles remain unfinished.",
    "",
    `The canonical work/status/dependency register is ${link(inventoryPath)}. This report is generated from it with \`npm run roadmap:frontend-a1\`; \`npm run audit:frontend-a1\` checks coverage and document agreement. The existing ${link("reports/FRONTEND-ADAPTATION-MILESTONE.md")} retains historical implementation evidence.`,
    "",
    "## Controlling contract and scope",
    "",
    "D024 controls the 30/70 persistent conversational Agent and reactive Workspace. D013 controls the official AG-UI integration and its authority boundary. D018 controls Project-owned definitions and outcome-first empty entry. D005/D021 control exact Review and human approval; D006 controls language and attribution; D007/D008 control model eligibility, bounded context and grounding; D010 controls snapshot-bound Hypothesis assessments and invalidation. The 23 UX requests and 18 flow families below supply the detailed construction obligations.",
    "",
    "The user's 2026-10-07 instruction makes the connected copilot, compositional claim examination, progressive disclosure, functioning AG-UI, graph guidance, and cyclic Hypothesis examination/verification required A1 work. These cannot be postponed to document Composition or the later general hypothesis milestone. New runtime contracts, schemas, persistence, model-role eligibility, adapters and frontend behavior are part of A1 wherever needed for this result. Proposed runtime shapes in older handoffs must be resolved and implemented; the word proposed is not an exemption.",
    "",
    "The required graph is discoverable and functional within Workspace, linked to the current conversation and exact examined evidence. Graph selection and a bound semantic scene guide the agent's context and eligible next actions. Routine work may still finish without opening a graph, and the default home remains the outcome rather than a graph canvas. Read-only graph state and AG-UI projections confer no mutation authority.",
    "",
    "Compositionally means the shared examiner, conversation, Workspace, graph and governance slots resolve registered ProjectDefinition-specific object, relationship, inquiry, validator and language components. Scientific Claims/Assertions, writing requirements/interpretations and an unrelated compatible definition must each work with their own semantics. A shared shell alone is insufficient, and domain-specific global UI branches cannot substitute for this registry.",
    "",
    "A1 implements the scoped assessment/posture/obligation/closure/invalidation behavior needed for its demonstrated cycles. M3 retains broader research agency and additional assessment libraries; it does not retain an A1 cycle prerequisite. General experiment execution remains M4. Full document Composition remains the 15 Wave 7 operations. Wave 8 retains four new governed Settings/capability operations. Existing applicable policy, capability, validation and authority must already be inspectable in A1; unsupported policy automation must be explicit.",
    "",
    "## Required work cycle",
    "",
    "1. Frame or select an exact outcome, inquiry, question or Hypothesis; preserve the current definition and snapshot.",
    "2. Ask and clarify in normal Q&A; compile bounded context and show missing or uncertain basis.",
    "3. Retrieve or admit exact evidence; retain source-native statements and non-authoritative working candidates/relationships.",
    "4. Examine the relevant object, claim, scope, provenance, rivals, contrary evidence and registered validation criteria in Workspace.",
    "5. Inspect and decide consequential changes through exact Review/Approval commands; observe the retained result and projection position.",
    "6. Use the recorded graph basis to assess the inquiry/Hypothesis, explain limitations, and propose an eligible next examination.",
    "7. Record a scoped disposition only when its criteria and mandatory obligations permit it; retain unresolved questions and safe stop/defer paths.",
    "8. When evidence or dependencies change, mark affected assessments/closures stale or invalid, preserve history, and start the next examination cycle with a new version.",
    "",
    "Verification here means a scoped finding supported by named criteria and examined evidence. Model fluency, source citation, Work success, graph presence, and a completed operation do not independently establish it. Development, activity, warrant and lifecycle remain distinct. Missing information stays unknown.",
    "",
    "## Ownership, status and evidence rules",
    "",
    "Owners below are accountable implementation roles, not claims that a person or agent has been dispatched. Runtime owns contracts/core/model/context/persistence/server boundaries; frontend owns components/controllers/renderers; integration owns connected paths, migration and delivery; validation owns independent execution/review; user owns final acceptance. Each slice follows the dependency graph even when stage numbers differ: graph-guided cycles in A1.4 require A1.3 runtime contracts and A1.4 graph/scene construction.",
    "",
    "Every implementation work item is mandatory. planned, in_progress and blocked remain incomplete. There is no skipped, deferred or superseded status for required work. Added required work receives a new stable ID. Removing a required baseline ID fails the audit. Material scope changes require an explicit user instruction and a recorded contract amendment; editing a status or criterion is not evidence. The sixteen optional end-of-A1 scenarios are supplementary checks, not contracted functions or release prerequisites.",
    "",
    "Complete means all observable criteria pass, every prerequisite is complete, and retained completion evidence exists. Partial mechanics belong under retained evidence and do not close the item. The three creation records preserve their narrow existing completion; the expanded conversational zero/empty entry remains open. All other product records remain open until their own criteria are demonstrated.",
    "",
    "Completion evidence belongs to each contracted function and implementation item: retain the exact candidate commit, reproducible invocation, inputs, profile/definition and snapshot bindings, actual backend/provider, observable result, relevant receipts/screenshots, adverse cases, and coverage limits. A mocked renderer or deterministic HTTP browser can prove a bounded component; integrated functional behavior also needs its real persistence/typed owners/official adapters and actual eligible model use where the function calls a model. External model invocation follows the project's existing authorization and resource rules. All evidence follows scripts/wave-evidence-policy.md.",
    "",
    "The wave controller checks the ledger before Wave 7 or later worker execution, resume, extension, or acceptance. npm run gate:frontend-a1 must fail until every required implementation record and explicit user acceptance is complete. Optional scenario status does not affect this gate or the functional contract fingerprint. No completion command writes an acceptance record. The reserved user_acceptance record must contain actor=user, decision=accepted, the user's explicit statement/date, candidate_commit, candidate_fingerprint and a retained artifact. The fingerprint binds the accepted candidate's implementation trees to the required contract, and the candidate must be integrated into the delivery branch. Later-wave work preserves A1 through its regression gates; a changed contract or user rejection requires revalidation and reopening affected records. Repository evidence supports technical review; only the user's actual decision supplies product acceptance.",
    "",
    "## Milestone status",
    "",
    "| Milestone | Required result | Complete / total | State |",
    "| --- | --- | --- | --- |",
  ];
  for (const milestone of data.milestones) {
    const items = data.work_items.filter(
      (item) => item.milestone === milestone.id,
    );
    const complete = items.filter((item) => item.status === "complete").length;
    lines.push(
      `| ${milestone.id} | ${milestone.title} | ${complete} / ${items.length} | ${complete === items.length ? "complete" : "in_progress"} |`,
    );
  }
  lines.push(
    "",
    "Only documentation/control reconciliation and the retained narrow creation mechanics are complete. This count is not a product percentage or an ETA.",
    "",
    "## Implementation records",
    "",
  );
  for (const milestone of data.milestones) {
    lines.push(`### ${milestone.id} — ${milestone.title}`, "");
    for (const item of data.work_items.filter(
      (record) => record.milestone === milestone.id,
    )) {
      lines.push(
        `<a id="${item.id.toLowerCase().replaceAll(".", "")}"></a>`,
        "",
        `#### ${item.id} — ${item.title}`,
        "",
        `- **State:** \`${item.status}\`; **owner:** ${item.owner}.`,
        `- **Prerequisites:** ${item.depends_on.length ? item.depends_on.map(itemRef).join(", ") : "None; establishes the baseline."}`,
        `- **Contracts:** ${item.contracts.join(", ")}.`,
        `- **Construct:** ${item.implementation}`,
        "- **Complete only when:**",
        ...item.acceptance.map((criterion) => `  - ${criterion}`),
        `- **Retained partial evidence:** ${item.retained_evidence.length ? item.retained_evidence.map(link).join(", ") : "None assigned; no implementation claim."}`,
      );
      if (item.completion_evidence.length) {
        lines.push(
          "- **Completion evidence:**",
          ...item.completion_evidence.map(
            (record) =>
              `  - ${link(record.artifact)}; \`${record.command}\`. ${record.boundary}`,
          ),
        );
      } else
        lines.push(
          "- **Completion evidence:** Missing; this item cannot close.",
        );
      lines.push("");
    }
  }
  lines.push(
    "",
    "## Exact operation ownership",
    "",
    "The assigned work item owns adapted presentation conformance, and depends on the other construction records needed for the complete task. Assignment does not close the operation or the work item. The old 116-operation inventory cannot account for new conversation/assessment/scene construction by itself; those remain mandatory separate records above.",
    "",
    "| Operation | Required release | Conformance owner or A1 boundary |",
    "| --- | --- | --- |",
  );
  for (const row of data.operation_coverage)
    lines.push(
      `| \`${row.operation}\` | ${row.release} | ${itemRef(row.work_item ?? row.a1_boundary)} |`,
    );
  lines.push(
    "",
    "## Accepted requirement coverage",
    "",
    `The detailed semantics remain in ${link("reports/UX-BACKEND-HANDOFF.md")}. Historical milestone assignments there are amended for the required A1 behavior by this explicit ledger; later implementation dispositions and their retained evidence are not erased.`,
    "",
    "| Request | A1 implementation owners | Scope |",
    "| --- | --- | --- |",
  );
  for (const row of data.request_coverage)
    lines.push(
      `| ${row.request} | ${row.work_items.map(itemRef).join(", ")} | ${row.scope} |`,
    );
  lines.push(
    "",
    "## Accepted flow coverage",
    "",
    `The entry, transition and terminal contracts remain in ${link("reports/UX-FLOW-ARCHITECTURE.md")}. Every applicable A1 path requires direct/agent parity, adverse state, exact return and accessible peer. Broader future capabilities remain assigned explicitly.`,
    "",
    "| Flow | A1 stages | Required disposition |",
    "| --- | --- | --- |",
  );
  for (const row of data.flow_coverage)
    lines.push(`| ${row.flow} | ${row.milestones.join(", ")} | ${row.scope} |`);
  lines.push(
    "",
    "## Execution order and release gate",
    "",
    "1. Resolve and register the new conversational/model-role/text/context contracts (A1.3), alongside copilot component construction (A1.1) and definition adapters (A1.2).",
    "2. Connect normal Q&A, authorized exact reads, working candidates/relations, AG-UI proposals/interrupts and durable replay (A1.3).",
    "3. Connect the reactive Workspace and domain examiners; complete native Review, bounded graph queries, interactive graph and bound scene/peer (A1.4).",
    "4. Complete scoped assessments, posture/obligations, graph-guided next work, cyclic examination, explicit disposition and dependency invalidation (A1.4).",
    "5. Complete all Inspect levels, policy/prerequisite/receipt/provenance/History/impact/recovery reads and exact return (A1.5).",
    "6. Close all 97 adapted operations, obsolete frontend debt and delivery-branch integration (A1.6).",
    "7. Verify the required functions against their own completion criteria, resolve material findings, pass repository/conformance gates and publish the exact inspection candidate (A1.7). The optional scenarios below may be used at this point for supplementary review.",
    "8. Obtain explicit user acceptance; only then release Wave 7's fifteen document Composition operations. Wave 8 follows its own gates and completes four remaining governed control/capability operations plus whole-product validation.",
    "",
    "A stage label, isolated route, preserved draft, protocol stream, rendered graph or positive unit test cannot substitute for the functional acceptance criteria. A later wave cannot start with any mandatory A1 record incomplete.",
    "",
    "## Optional end-of-A1 scenarios",
    "",
    "The user retained these sixteen supplementary validation groupings as optional toward the end of A1. They add no functions to scope. They may be selected during A1.7 once the corresponding functions are implemented. Leaving them not_run or not_selected does not block function completion, user acceptance, or the later-wave gate. Findings about an actual contracted function still belong to that function's work record.",
    "",
    "| Optional check | Suggested grouping | Status |",
    "| --- | --- | --- |",
  );
  for (const scenario of data.optional_scenarios)
    lines.push(
      `| ${scenario.id}: ${scenario.title} | ${scenario.task} | ${scenario.status} |`,
    );
  return format(lines.join("\n"), { parser: "markdown" });
}

async function main() {
  const args = process.argv.slice(2);
  requireCondition(
    args.every((arg) =>
      ["--write", "--require-complete", "--fingerprint"].includes(arg),
    ),
    "Unknown A1 audit argument.",
  );
  const data = JSON.parse(
    readFileSync(resolve(repositoryRoot, inventoryPath), "utf8"),
  );
  const operations = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, "scripts/ui-operation-inventory.json"),
      "utf8",
    ),
  ).operations;
  validateA1Inventory(data, operations, {
    checkArtifacts: !args.includes("--write"),
  });
  const report = await renderA1Ledger(data);
  if (args.includes("--write"))
    writeFileSync(resolve(repositoryRoot, reportPath), report);
  else
    requireCondition(
      readFileSync(resolve(repositoryRoot, reportPath), "utf8") === report,
      "A1 report differs from the canonical ledger; run npm run roadmap:frontend-a1.",
    );
  if (args.includes("--require-complete")) assertFrontendA1Complete();
  if (args.includes("--fingerprint"))
    process.stdout.write(`${candidateFingerprint(data)}\n`);
  else {
    const complete = data.work_items.filter(
      (item) => item.status === "complete",
    ).length;
    process.stdout.write(
      `A1 ledger: ${data.work_items.length} required work items (${complete} complete, ${data.work_items.length - complete} incomplete); ${operations.length} operation assignments; 23 requests; 18 flows; ${data.optional_scenarios.length} optional late checks (not gated). Structural coverage passes; product acceptance remains ${data.user_acceptance?.decision ?? "missing"}.\n`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath)
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });

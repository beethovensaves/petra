import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readA1 } from "../../scripts/frontend-a1-execute.mjs";
import { executionOrder } from "../../scripts/frontend-a1-process.mjs";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const data = readA1(root);
export const item = (id, d = data) => d.work_items.find((w) => w.id === id);
export const text = (path) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");
export const approvalText = () => text("reports/FE-A1-ROADMAP-APPROVAL.md");

export function approvalHold(d = data) {
  assert.equal(d.roadmap_review.status, "awaiting_user_approval");
  assert.equal(d.roadmap_review.user_approval, null);
  assert.equal(d.active_work, null);
  assert.equal(item("FE-A1.0-W05", d).status, "blocked");
  assert.match(item("FE-A1.0-W05", d).blocker, /Explicit user approval/);
  for (const w of d.work_items.filter((w) => w.milestone !== "FE-A1.0")) {
    assert.equal(w.status, "planned");
    assert.ok(
      w.depends_on.includes("FE-A1.0-W05"),
      w.id + " lacks the approval prerequisite",
    );
  }
  assert.equal(d.user_acceptance, null);
}

export function shellFirst(d = data) {
  const order = executionOrder(d).map((w) => w.id);
  for (let i = 1; i <= 7; i++)
    assert.ok(
      order.indexOf(`FE-A1.1-W0${i}`) < order.indexOf("FE-A1.3-W01"),
      "runtime starts before complete shell construction",
    );
  for (const dependency of [
    "FE-A1.4-W07",
    "FE-A1.4-W09",
    "FE-A1.3-W06",
    "FE-A1.3-W11",
  ])
    assert.ok(
      item("FE-A1.3-W07", d).depends_on.includes(dependency),
      "action mediation omits " + dependency,
    );
  assert.ok(order.indexOf("FE-A1.3-W03") < order.indexOf("FE-A1.3-W02"));
  assert.ok(!item("FE-A1.1-W01", d).depends_on.includes("FE-A1.3-W05"));
}

export function nativeAndCycleContract(d = data) {
  assert.ok(
    item("FE-A1.4-W06", d).depends_on.includes("FE-A1.4-W04"),
    "native examination precedes exact Source reading",
  );
  assert.ok(
    item("FE-A1.4-W19", d).depends_on.includes("FE-A1.4-W21"),
    "graph-guided work precedes stale/restricted-result protection",
  );
  const native = item("FE-A1.4-W06", d).acceptance.join(" ");
  for (const meaning of [
    "Claim/Assertion",
    "Hypothesis",
    "Requirement",
    "Interpretation",
    "Event-planning",
    "native",
    "relationships",
    "validator",
  ])
    assert.ok(native.includes(meaning), "native contract omitted " + meaning);
  for (const dependency of ["FE-A1.4-W14", "FE-A1.4-W15", "FE-A1.4-W19"])
    assert.ok(
      item("FE-A1.4-W13", d).depends_on.includes(dependency),
      "cycle closure lacks " + dependency,
    );
  assert.match(
    item("FE-A1.4-W13", d).acceptance.join(" "),
    /two connected cycles/,
  );
  assert.match(
    item("FE-A1.4-W14", d).acceptance.join(" "),
    /Open mandatory obligations/,
  );
  assert.match(
    item("FE-A1.4-W15", d).acceptance.join(" "),
    /retracting supporting evidence/,
  );
  assert.match(item("FE-A1.4-W18", d).acceptance.join(" "), /scene\/peer/);
}

export function ownership(d = data) {
  const ordinary = item("FE-A1.3-W03", d).implementation;
  assert.doesNotMatch(
    ordinary,
    /Serialize the execution claim|retain a separate immutable human/,
  );
  const bridge = item("FE-A1.3-W07", d).implementation;
  for (const part of [
    "canonical origin turn",
    "complete server-owned command",
    "immutable human accept/reject",
    "ordinary",
    "native receipt",
    "Workspace",
  ])
    assert.ok(bridge.includes(part), "command item omits " + part);
  assert.match(
    item("FE-A1.3-W01", d).acceptance.join(" "),
    /live model eligibility and integrated user behavior close under W02 and W06/i,
  );
}

export function scopeBinding() {
  const result = spawnSync(
    "python3",
    [
      "-c",
      String.raw`
import json,hashlib
from pathlib import Path
d=json.loads(Path('scripts/frontend-a1-work-inventory.json').read_text())
s={'work':[{k:w.get(k) for k in ['id','milestone','title','owner','implementation','acceptance','depends_on','contracts']} for w in d['work_items']],'execution_policy':d['execution_policy'],'operations':d['operation_coverage'],'requests':d['request_coverage'],'flows':d['flow_coverage'],'repairs':d['repair_sequence'],'approval_rule':d['last_user_feedback']['summary']}
print('sha256:'+hashlib.sha256(json.dumps(s,sort_keys=True,separators=(',',':')).encode()).hexdigest())
`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

export function unchangedProduct() {
  const result = spawnSync(
    "python3",
    [
      "-c",
      String.raw`
import json,hashlib,subprocess
from pathlib import Path
d=json.loads(Path('scripts/frontend-a1-work-inventory.json').read_text())
for r,expected in d['roadmap_review']['baseline_product_fingerprints'].items():
 root=Path(r)
 paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','--','apps','packages','workers','infra','schemas','scripts/a1','scripts/frontend-a1-process.mjs','scripts/frontend-a1-execute.mjs','scripts/audit-frontend-a1.mjs','scripts/wave-handoff.mjs','package.json','package-lock.json'],cwd=root,text=True).splitlines()
 files={p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in sorted(set(paths)) if (root/p).is_file()}
 h=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()
 assert h==expected['fingerprint'],r+' product/controller bytes changed'
 assert len(files)==expected['file_count']
 print(json.dumps({'root':r,'file_count':len(files),'unchanged':True}))
`,
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

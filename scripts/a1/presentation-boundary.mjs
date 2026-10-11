import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
export function protocolDependencies(source, filename) {
  const tree = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const forbidden = [];
  const walk = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.startsWith("@ag-ui/")
    )
      forbidden.push(node.moduleSpecifier.text);
    if (
      filename.endsWith(".tsx") &&
      ts.isStringLiteral(node) &&
      /^(RUN_STARTED|RUN_FINISHED|RUN_ERROR|ACTIVITY_SNAPSHOT|STATE_SNAPSHOT|TOOL_CALL_START|TEXT_MESSAGE_CONTENT)$/u.test(
        node.text,
      )
    )
      forbidden.push(node.text);
    ts.forEachChild(node, walk);
  };
  walk(tree);
  return forbidden;
}
export function inspectPresentationBoundary() {
  const findings = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/u.test(path) && !/\.test\.tsx?$/u.test(path)) {
        for (const dependency of protocolDependencies(
          readFileSync(path, "utf8"),
          path,
        ))
          findings.push({ path, dependency });
      }
    }
  };
  walk("packages/core/src");
  walk("apps/workbench/src");
  return findings;
}

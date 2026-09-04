import { Link } from "react-router";

import { ResearchShell } from "../shell/ResearchShell.js";
import { SELECTED_CLAIM_SHELL_FIXTURE } from "./shell.js";
import "./shell-gallery.css";

export const ShellGallery = (): React.JSX.Element => {
  const fixture = SELECTED_CLAIM_SHELL_FIXTURE;
  const search =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const initialView = search.get("view") === "graph" ? "graph" : undefined;
  const requestedTheme = search.get("theme");
  const initialTheme =
    requestedTheme === "graphite" ||
    requestedTheme === "stone" ||
    requestedTheme === "contrast" ||
    requestedTheme === "system"
      ? requestedTheme
      : undefined;
  const initialLayout =
    search.get("panels") === "minimum"
      ? { map: 176, details: 304, assistant: 240 }
      : undefined;
  const coverage = [
    {
      name: "Workspace context and navigation",
      status: "Interactive",
      detail: "Project context, view switching, selection, and collapse state.",
    },
    {
      name: "Themes, panels, and accessibility settings",
      status: "Interactive",
      detail:
        "Four themes, resize handles, presets, code text, and motion settings.",
    },
    {
      name: "Evidence and Details",
      status: "Representative",
      detail:
        "One mapped Claim with source, scope, relationships, and history.",
    },
    {
      name: "Focused graph",
      status: "Interactive",
      detail:
        "Bounded 2D canvas, task layouts, filters, depth, history, and text view.",
    },
    {
      name: "Petra agent",
      status: "Presentation only",
      detail:
        "Context, posture, explanation, and work state; UX1.6 paths await discussion.",
    },
    {
      name: "Deferred module destinations",
      status: "Not shown",
      detail:
        "Retained in fixture disclosure, but omitted from product navigation until their module loops.",
    },
  ];

  return (
    <div className="shell-gallery">
      <header className="shell-gallery__review-bar">
        <div>
          <strong>UX1.1 shell fixture</strong>
          <code>{fixture.scenarioId}</code>
          <span>{fixture.title}</span>
        </div>
        <nav aria-label="Fixture destinations">
          <a href="#shell-function-coverage">Coverage</a>
          <Link to="/__fixtures/primitives">Primitives</Link>
          <Link to="/__fixtures/foundation">States</Link>
          <Link to="/">Workbench</Link>
        </nav>
      </header>

      <ResearchShell
        model={fixture.viewModel}
        initialAssistantCollapsed={false}
        {...(initialView === undefined ? {} : { initialView })}
        {...(initialTheme === undefined ? {} : { initialTheme })}
        {...(initialLayout === undefined ? {} : { initialLayout })}
      />

      <footer className="shell-gallery__boundary">
        <div>
          <strong>Fixture boundary</strong>
          <p>{fixture.summary}</p>
        </div>
        <section id="shell-function-coverage">
          <strong>Function coverage</strong>
          <ul className="shell-gallery__coverage">
            {coverage.map((item) => (
              <li key={item.name} data-status={item.status}>
                <div>
                  <span aria-hidden="true" />
                  <b>{item.name}</b>
                  <em>{item.status}</em>
                </div>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
        <details>
          <summary>Contract mapping</summary>
          <dl>
            {fixture.contractMappings.map((mapping) => (
              <div key={mapping.field} data-contract-status={mapping.status}>
                <dt>{mapping.field}</dt>
                <dd>
                  <span>{mapping.status.replaceAll("_", " ")}</span>
                  {mapping.source}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </footer>
    </div>
  );
};

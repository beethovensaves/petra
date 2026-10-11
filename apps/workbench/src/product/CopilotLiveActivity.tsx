import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import {
  readCopilotPresentation,
  subscribeCopilotPresentation,
} from "@petra/adapters/ag-ui";

/** A business read model only: SDK events cannot enter the feature component. */
export function CopilotLiveActivity({
  projectId,
}: {
  projectId: string;
}): React.JSX.Element | null {
  const view = useSyncExternalStore(
    subscribeCopilotPresentation,
    () => {
      try {
        return readCopilotPresentation(
          projectId,
          window.sessionStorage.getItem("petra.auth.token") ??
            "petra-local-development",
        );
      } catch {
        return undefined;
      }
    },
    () => undefined,
  );
  if (view === undefined) return null;
  const active = ["connecting", "running", "disclosing"].includes(view.phase);
  return (
    <section
      className="copilot-live-activity"
      aria-label="Current conversation activity"
      data-copilot-phase={view.phase}
      data-run-id={view.runId}
    >
      <p role="status">{view.activity}</p>
      {active && view.blocks.length > 0 ? (
        <div
          className="copilot-live-answer"
          aria-label="Validated answer arriving"
        >
          <small>Advisory answer</small>
          {view.blocks.map((block) => (
            <article key={block.index} data-disclosed-block={block.index}>
              <p>{block.text}</p>
              {block.citations.length === 0 ? null : (
                <ul>
                  {block.citations.map((citation) => (
                    <li key={citation.key}>
                      <Link to={citation.destination}>{citation.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      ) : null}
      {view.limitation === undefined ? null : <p>{view.limitation}</p>}
      {view.work === undefined ? null : (
        <Link to={view.work.destination}>Inspect conversation task</Link>
      )}
    </section>
  );
}

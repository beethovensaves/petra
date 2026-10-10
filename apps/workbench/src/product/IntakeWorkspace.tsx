import { createContext, useContext, useState, type ReactNode } from "react";
import type { IntakeCopilotRead } from "@petra/adapters/ag-ui";
import type { IntakeCopilotTurn } from "@petra/core";
interface IntakeWorkspaceState {
  read?: IntakeCopilotRead;
  select: (read: IntakeCopilotRead) => void;
  turn?: IntakeCopilotTurn;
  present: (turn: IntakeCopilotTurn) => void;
  dismiss: () => void;
  creationPending: boolean;
  setCreationPending: (pending: boolean) => void;
  revision: number;
  refresh: () => void;
}
const Context = createContext<IntakeWorkspaceState | null>(null);
export const IntakeWorkspaceProvider = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const [read, setRead] = useState<IntakeCopilotRead>();
  const [turn, setTurn] = useState<IntakeCopilotTurn>();
  const [creationPending, setCreationPending] = useState(false);
  const [revision, setRevision] = useState(0);
  return (
    <Context.Provider
      value={{
        ...(read === undefined ? {} : { read }),
        select: setRead,
        ...(turn === undefined ? {} : { turn }),
        present: setTurn,
        dismiss: () => setTurn(undefined),
        creationPending,
        setCreationPending,
        revision,
        refresh: () => setRevision((value) => value + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
};
export const useIntakeWorkspace = (): IntakeWorkspaceState | null =>
  useContext(Context);
export const IntakeWorkspaceAnswer = (): React.JSX.Element | null => {
  const workspace = useIntakeWorkspace();
  const turn = workspace?.turn;
  if (turn === undefined) return null;
  return (
    <section
      className="copilot-workspace-result"
      aria-label="Pre-Project answer"
    >
      <header>
        <div>
          <p className="reference-panel-kicker">Pre-Project discussion</p>
          <h2>{turn.question}</h2>
        </div>
        <button type="button" onClick={workspace?.dismiss}>
          Return to Projects
        </button>
      </header>
      <p className="copilot-advisory-note">
        This discussion helps frame an outcome. It contains no Project evidence
        or approved definition.
      </p>
      {turn.terminal?.output?.blocks.map((block, index) => (
        <article key={index} className="copilot-answer-block">
          <small>
            {block.kind === "inference"
              ? "Tentative inference"
              : block.kind === "question"
                ? "Question"
                : "Suggestion"}
          </small>
          <p>{block.text}</p>
        </article>
      ))}
      <details>
        <summary>What Petra could use for this answer</summary>
        <p>
          {turn.context.content.outcome_wording ??
            "No outcome wording had been selected."}
        </p>
        {turn.context.content.limitations.map((limit) => (
          <p key={limit}>{limit}</p>
        ))}
        {turn.input_manifest === undefined ? (
          <p>No prepared model input is retained for this run.</p>
        ) : (
          <>
            <p>
              {turn.input_manifest.content.included_history_count} of{" "}
              {turn.input_manifest.content.retained_history_count} prior turns
              included; {turn.input_manifest.content.input_bytes} bytes of model
              input.
            </p>
            <pre>{JSON.stringify(turn.input_manifest, null, 2)}</pre>
          </>
        )}
      </details>
    </section>
  );
};

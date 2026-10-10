import { GraphPresentationDetails } from "./GraphPresentationDetails.js";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import type { GraphPresentationBinding } from "@petra/core/graph-presentation";
import type { CopilotContext, CopilotTurn } from "@petra/core";

export type SharedGraphState =
  | { status: "preparing" }
  | { status: "failed"; reason: string }
  | { status: "ready"; binding: GraphPresentationBinding };
interface CopilotWorkspaceState {
  sharedGraph?: SharedGraphState;
  shareScene: (owner: string, value: SharedGraphState) => void;
  clearScene: (owner: string) => void;
  turn?: CopilotTurn;
  selection?: CopilotContext["records"][number];
  visible: boolean;
  focusKeys: string[];
  contextRevision: number;
  refreshContext: () => void;
  focus: (keys: string[]) => void;
  present: (turn: CopilotTurn) => void;
  select: (record: CopilotContext["records"][number]) => void;
  dismiss: () => void;
}
const Context = createContext<CopilotWorkspaceState | null>(null);

export const CopilotWorkspaceProvider = ({
  children,
  onOpenWorkspace,
}: {
  children: ReactNode;
  onOpenWorkspace?: () => void;
}): React.JSX.Element => {
  const [shared, setShared] = useState<{
    owner: string;
    value: SharedGraphState;
  }>();
  const shareScene = useCallback(
    (owner: string, value: SharedGraphState) => setShared({ owner, value }),
    [],
  );
  const clearScene = useCallback(
    (owner: string) =>
      setShared((previous) =>
        previous?.owner === owner ? undefined : previous,
      ),
    [],
  );
  const [contextRevision, setContextRevision] = useState(0);
  const refreshContext = useCallback(
    () => setContextRevision((n) => n + 1),
    [],
  );
  const [turn, setTurn] = useState<CopilotTurn>();
  const [selection, setSelection] =
    useState<CopilotContext["records"][number]>();
  const [visible, setVisible] = useState(false);
  const [focusKeys, setFocusKeys] = useState<string[]>([]);
  const focus = useCallback(
    (keys: string[]) =>
      setFocusKeys((previous) =>
        previous.join("\n") === keys.join("\n") ? previous : keys,
      ),
    [],
  );
  return (
    <Context.Provider
      value={{
        focus,
        shareScene,
        clearScene,
        ...(shared === undefined ? {} : { sharedGraph: shared.value }),
        contextRevision,
        refreshContext,
        ...(turn === undefined ? {} : { turn }),
        ...(selection === undefined ? {} : { selection }),
        visible,
        focusKeys,
        present: (next) => {
          setTurn(next);
          setSelection(undefined);
          setVisible(true);
          onOpenWorkspace?.();
        },
        select: (record) => {
          setSelection(record);
          setFocusKeys([record.key]);
          setVisible(true);
          onOpenWorkspace?.();
        },
        dismiss: () => setVisible(false),
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useCopilotWorkspace = (): CopilotWorkspaceState | null =>
  useContext(Context);

const blockLabels = {
  source_report: "Source report",
  inference: "Tentative inference",
  advice: "Suggested next step",
  question: "Question",
} as const;

const retainedStatement = (text?: string): string | undefined => {
  if (text === undefined) return undefined;
  const start = text.indexOf("{");
  if (start === -1) return text;
  try {
    const native: unknown = JSON.parse(text.slice(start));
    if (typeof native !== "object" || native === null) return text;
    const outer = native as Record<string, unknown>;
    const record =
      typeof outer.native_record === "object" && outer.native_record !== null
        ? (outer.native_record as Record<string, unknown>)
        : outer;
    const content =
      typeof record.content === "object" && record.content !== null
        ? (record.content as Record<string, unknown>)
        : {};
    const statement = [
      record.canonical_text,
      record.statement,
      content.statement,
      content.description,
    ].find((value) => typeof value === "string");
    return typeof statement === "string" ? statement : undefined;
  } catch {
    return text;
  }
};

export const CopilotWorkspaceResult = (): React.JSX.Element | null => {
  const workspace = useCopilotWorkspace();
  if (
    workspace === null ||
    !workspace.visible ||
    (workspace.turn === undefined && workspace.selection === undefined)
  )
    return null;
  const { turn, selection } = workspace;
  return (
    <section
      className="copilot-workspace-result"
      aria-label={
        selection === undefined
          ? "Petra answer"
          : "Evidence selected in conversation"
      }
    >
      <header>
        <div>
          <p className="reference-panel-kicker">
            {selection === undefined ? "Petra answer" : selection.kind}
          </p>
          <h2>{selection?.label ?? turn?.question}</h2>
        </div>
        <button type="button" onClick={workspace.dismiss}>
          Return to workspace
        </button>
      </header>
      {selection === undefined ? (
        <>
          <p className="copilot-advisory-note">
            This answer offers guidance. Review and verification remain separate
            actions.
          </p>
          {turn?.terminal?.output?.blocks.map((block, index) => (
            <article
              key={index}
              className="copilot-answer-block"
              data-kind={block.kind}
            >
              <small>{blockLabels[block.kind]}</small>
              <p>{block.text}</p>
              <div className="copilot-citations">
                {block.citations.map((key) => {
                  const record = turn.context.records.find(
                    (item) => item.key === key,
                  );
                  return record === undefined ? null : (
                    <button
                      type="button"
                      key={key}
                      onClick={() => workspace.select(record)}
                    >
                      {record.label}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
          {turn?.shared_scene === undefined ? null : (
            <GraphPresentationDetails scene={turn.shared_scene} />
          )}
          {turn === undefined ? null : (
            <details>
              <summary>Context and limitations</summary>
              <p>{turn.context.objective_statement}</p>
              <ul>
                {turn.context.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                Answer basis: Project revision{" "}
                {turn.context.basis.project_revision}, event{" "}
                {turn.context.basis.event_position}.
              </p>
              <code>{turn.context.content_hash}</code>
            </details>
          )}
        </>
      ) : (
        <>
          <p className="copilot-advisory-note">
            Exact retained context from the conversation. This is a bounded
            record summary.
          </p>
          <p className="copilot-evidence-text">
            {selection.reportable_text ??
              retainedStatement(selection.text) ??
              "This retained answer contains a record reference. Open the examiner to read the exact native material; its source text was not included in this answer's context."}
          </p>
          <Link to={selection.destination} onClick={workspace.dismiss}>
            Examine in workspace →
          </Link>
          <details>
            <summary>Inspect record identity</summary>
            <dl>
              <dt>Record</dt>
              <dd>{selection.ref.record_id}</dd>
              <dt>Revision</dt>
              <dd>{selection.ref.revision}</dd>
              <dt>Record hash</dt>
              <dd>
                <code>{selection.ref.record_hash}</code>
              </dd>
            </dl>
            {selection.text === undefined ? null : <pre>{selection.text}</pre>}
          </details>
        </>
      )}
    </section>
  );
};

/** Retains the owning route and its unsent drafts while an answer is inspected. */
export const CopilotWorkspaceBody = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const workspace = useCopilotWorkspace();
  return (
    <>
      <CopilotWorkspaceResult />
      <div hidden={workspace?.visible === true}>{children}</div>
    </>
  );
};

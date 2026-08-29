import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  createBrowserRouter,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";

import type { PetraClientEvent } from "@petra/adapters";

interface HealthState {
  ok: boolean;
  accepting: boolean;
}

type ResearchMode = "guided" | "agentic";
type RunStatus = "idle" | "running" | "complete" | "error";
type IconName = "brief" | "project" | "hypothesis" | "evidence" | "graph";

const ICON_PATHS: Record<IconName, string> = {
  brief: "M5 4.5h14v15H5zM8 8h8M8 12h5M8 16h7",
  project: "M4 7.5h6l2 2h8v10H4zM4 7.5v-2h7l2 2",
  hypothesis:
    "M12 3.5v3M6.5 6l2 2M17.5 6l-2 2M7 13a5 5 0 1 1 10 0c0 2-1 3-2.5 4.5V20h-5v-2.5C8 16 7 15 7 13z",
  evidence: "M6 3.5h9l3 3v14H6zM15 3.5v4h3M9 11h6M9 15h6",
  graph: "M6 7.5 12 4l6 4-1 8-6 4-6-4zM6 7.5l5 4.5 7-4M11 12v8",
};

const loadHealth = async (): Promise<HealthState> => {
  try {
    const response = await fetch("/health");
    if (!response.ok) return { ok: false, accepting: false };
    return (await response.json()) as HealthState;
  } catch {
    return { ok: false, accepting: false };
  }
};

const requireParameter = (args: LoaderFunctionArgs, name: string): string => {
  const value = args.params[name];
  if (value === undefined) throw new Error("Research object not found.");
  return value;
};

const loadObject = (kind: string) => (args: LoaderFunctionArgs) => ({
  id: requireParameter(args, `${kind}Id`),
  kind,
  projectId: args.params.projectId,
});

const RockMark = (): React.JSX.Element => (
  <svg
    className="rock-mark"
    viewBox="0 0 264 260"
    aria-hidden="true"
    focusable="false"
  >
    <path
      className="rock-body"
      d="M52 44 145 12l81 38 25 82-32 86-94 29-87-42-26-89Z"
    />
    <path
      className="rock-facet"
      d="M52 44l60 59-20 66-54 36m74-102 62-33 52-20m-114 53 66 48 41 67m-127-49 86-18"
    />
  </svg>
);

const AppIcon = ({ name }: { name: IconName }): React.JSX.Element => (
  <svg className="app-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d={ICON_PATHS[name]} />
  </svg>
);

const Shell = (): React.JSX.Element => {
  const health = useLoaderData<HealthState>();
  return (
    <div className="shell">
      <header className="app-header">
        <Link to="/" className="brand" aria-label="Petra home">
          <RockMark />
          <span>PETRA</span>
        </Link>
        <div className="product-statement">
          Graph-native scientific research workbench
        </div>
        <div className="header-context">
          <span className="scope-pill">Local · private</span>
          <span className="engine-status">
            <span className={health.ok ? "status-dot online" : "status-dot"} />
            {health.ok && health.accepting ? "Engine ready" : "Engine offline"}
          </span>
        </div>
      </header>
      <div className="app-body">
        <aside className="rail">
          <nav aria-label="Primary">
            <NavLink to="/" end aria-label="Research brief" data-label="Brief">
              <AppIcon name="brief" />
            </NavLink>
            <NavLink
              to="/projects/demo"
              aria-label="Project"
              data-label="Project"
            >
              <AppIcon name="project" />
            </NavLink>
            <NavLink
              to="/projects/demo/hypotheses/H01"
              aria-label="Hypothesis H01"
              data-label="Hypothesis"
            >
              <AppIcon name="hypothesis" />
            </NavLink>
            <NavLink
              to="/projects/demo/evidence"
              aria-label="Evidence"
              data-label="Evidence"
            >
              <AppIcon name="evidence" />
            </NavLink>
            <NavLink
              to="/projects/demo/graph"
              aria-label="Scientific graph"
              data-label="Graph"
            >
              <AppIcon name="graph" />
            </NavLink>
          </nav>
          <div className="rail-rock" aria-hidden="true">
            <RockMark />
          </div>
        </aside>
        <main className="workspace">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const ModeSwitch = ({
  mode,
  onChange,
}: {
  mode: ResearchMode;
  onChange: (mode: ResearchMode) => void;
}): React.JSX.Element => (
  <div className="mode-control">
    <span>Autonomy</span>
    <div className="mode-switch" aria-label="Research autonomy">
      {(["guided", "agentic"] as const).map((choice) => (
        <button
          key={choice}
          className={mode === choice ? "selected" : ""}
          aria-pressed={mode === choice}
          onClick={() => onChange(choice)}
          type="button"
        >
          {choice === "guided" ? "Guided" : "Agentic"}
        </button>
      ))}
    </div>
  </div>
);

const GraphPreview = (): React.JSX.Element => (
  <section
    className="workbench-panel graph-panel"
    aria-labelledby="graph-title"
  >
    <header className="panel-header">
      <div>
        <p className="panel-kicker">Question map</p>
        <h2 id="graph-title">Graph canvas</h2>
      </div>
      <span className="semantic-badge neutral">Preview structure</span>
    </header>
    <div className="graph-tools" aria-label="Graph display state">
      <span>Question scope</span>
      <span>Labels on</span>
      <span>Depth 1</span>
    </div>
    <div className="graph-stage">
      <svg
        className="research-graph"
        viewBox="0 0 640 360"
        role="img"
        aria-label="Preview graph with a research question connected to candidate hypotheses and future evidence"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10Z" className="arrow-head" />
          </marker>
        </defs>
        <path className="edge neutral-edge" d="M148 177 282 101" />
        <path className="edge neutral-edge" d="M148 177 284 245" />
        <path className="edge inferred-edge" d="M317 101 464 83" />
        <path className="edge inferred-edge" d="M320 245 476 270" />
        <path className="edge challenge-edge" d="M307 120 305 226" />
        <path
          className="edge future-edge"
          d="M494 98 514 175"
          markerEnd="url(#arrow)"
        />
        <path
          className="edge future-edge"
          d="M500 255 518 199"
          markerEnd="url(#arrow)"
        />

        <g className="graph-node question-node" transform="translate(128 177)">
          <circle r="20" />
          <text x="0" y="5">
            Q
          </text>
        </g>
        <text className="node-label" x="62" y="218">
          Rough question
        </text>

        <g
          className="graph-node hypothesis-node"
          transform="translate(302 101)"
        >
          <circle r="17" />
          <text x="0" y="5">
            H1
          </text>
        </g>
        <text className="node-label" x="260" y="69">
          Candidate explanation
        </text>

        <g
          className="graph-node hypothesis-node faint"
          transform="translate(304 245)"
        >
          <circle r="17" />
          <text x="0" y="5">
            H2
          </text>
        </g>
        <text className="node-label" x="255" y="287">
          Alternative needed
        </text>

        <g
          className="graph-node evidence-node faint"
          transform="translate(482 82)"
        >
          <circle r="15" />
          <text x="0" y="5">
            E
          </text>
        </g>
        <text className="node-label" x="440" y="48">
          Future evidence
        </text>

        <g
          className="graph-node evidence-node faint"
          transform="translate(492 272)"
        >
          <circle r="15" />
          <text x="0" y="5">
            E
          </text>
        </g>
        <text className="node-label" x="450" y="315">
          Future evidence
        </text>

        <g
          className="graph-node decision-node faint"
          transform="translate(526 188)"
        >
          <circle r="14" />
          <text x="0" y="5">
            ?
          </text>
        </g>
        <text className="node-label" x="545" y="193">
          Discriminator
        </text>
      </svg>
      <div className="graph-empty-note">
        <span className="empty-note-mark">+</span>
        <div>
          <strong>No scientific claims yet</strong>
          <span>Petra will replace this preview with inspectable objects.</span>
        </div>
      </div>
    </div>
    <footer className="graph-legend" aria-label="Graph legend">
      <span>
        <i className="legend-dot question" /> Question
      </span>
      <span>
        <i className="legend-dot hypothesis" /> Hypothesis
      </span>
      <span>
        <i className="legend-dot evidence" /> Evidence
      </span>
      <span>
        <i className="legend-line challenge" /> Challenges
      </span>
    </footer>
  </section>
);

const EvidencePreview = (): React.JSX.Element => (
  <section
    className="workbench-panel evidence-panel"
    aria-labelledby="evidence-title"
  >
    <header className="panel-header">
      <div>
        <p className="panel-kicker">Source inspection</p>
        <h2 id="evidence-title">Evidence</h2>
      </div>
      <span className="panel-count">0 papers</span>
    </header>
    <div className="evidence-tabs" aria-label="Evidence view">
      <span className="active">Sources</span>
      <span>Claims</span>
      <span>Relations</span>
    </div>
    <div className="evidence-empty">
      <span className="evidence-glyph">
        <AppIcon name="evidence" />
      </span>
      <h3>No literature ingested</h3>
      <p>
        Results will show source depth, exact spans, review state, and
        provenance.
      </p>
    </div>
    <div className="depth-rules">
      <p>Reading depth</p>
      <div>
        <span>Metadata</span>
        <small>Identity and discovery</small>
      </div>
      <div>
        <span>Abstract</span>
        <small>Broad source-reported claims</small>
      </div>
      <div>
        <span>Full text</span>
        <small>Methods and detailed evidence</small>
      </div>
    </div>
    <footer className="panel-footer">
      <span className="semantic-badge evidence">Evidence</span>
      <span>Nothing accepted without provenance</span>
    </footer>
  </section>
);

const AssistantPanel = ({
  events,
  status,
}: {
  events: PetraClientEvent[];
  status: RunStatus;
}): React.JSX.Element => {
  const visibleTypes = [...new Set(events.map((event) => event.type))];
  return (
    <section
      className="workbench-panel assistant-panel"
      aria-labelledby="assistant-title"
      aria-live="polite"
    >
      <header className="panel-header">
        <div>
          <p className="panel-kicker">Research collaborator</p>
          <h2 id="assistant-title">Petra assistant</h2>
        </div>
        <span className={`run-state ${status}`}>{status}</span>
      </header>
      <div className="assistant-tabs">
        <span className="active">Assistant</span>
        <span>Activity</span>
        <span>Decisions</span>
      </div>
      <div className="assistant-thread">
        <div className="assistant-avatar">
          <RockMark />
        </div>
        <div className="assistant-message">
          {status === "idle" ? (
            <>
              <p>
                Bring me a rough question. I’ll help sharpen it, look for
                competing explanations, and keep every evidential step visible.
              </p>
              <ul>
                <li>Separate questions from hypotheses</li>
                <li>Label source depth and uncertainty</li>
                <li>Pause before consequential choices</li>
              </ul>
            </>
          ) : null}
          {status === "running" ? <p>Mapping the interaction path…</p> : null}
          {status === "error" ? (
            <p>The transport run failed. No research state was changed.</p>
          ) : null}
          {visibleTypes.length > 0 ? (
            <>
              <p>
                The AG-UI transport completed with these visible event classes:
              </p>
              <ol className="event-list">
                {visibleTypes.map((type) => (
                  <li key={type}>{type.toLowerCase().replaceAll("_", " ")}</li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>
      <div className="assistant-capability">
        <span className="semantic-badge review">Transport demo</span>
        <p>
          No language model is connected yet. This run tests the real AG-UI
          path.
        </p>
      </div>
    </section>
  );
};

const ResearchBrief = (): React.JSX.Element => {
  const [mode, setMode] = useState<ResearchMode>("guided");
  const [prompt, setPrompt] = useState(
    "What evidence would distinguish competing explanations of this effect?",
  );
  const [events, setEvents] = useState<PetraClientEvent[]>([]);
  const [status, setStatus] = useState<RunStatus>("idle");

  const begin = async (): Promise<void> => {
    setStatus("running");
    setEvents([]);
    const suffix = crypto.randomUUID();
    try {
      const { PetraInteractionClient } = await import("@petra/adapters");
      const client = new PetraInteractionClient({
        endpoint: "/api/interactions/run",
        token: "petra-local-development",
      });
      const result = await client.run({
        threadId: `thread_${suffix}`,
        runId: `run_${suffix}`,
        prompt,
      });
      setEvents(result.events);
      setStatus("complete");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="research-screen">
      <header className="research-heading">
        <div>
          <p className="eyebrow">New inquiry · Research brief</p>
          <h1>Begin with a question, not an answer.</h1>
          <p className="lede">
            Petra turns uncertainty into an inspectable path through hypotheses,
            literature, evidence, and decisions.
          </p>
        </div>
        <div className="brief-meta">
          <span className="meta-label">Project</span>
          <strong>Untitled inquiry</strong>
          <span className="meta-detail">
            Private workspace · no sources yet
          </span>
        </div>
      </header>

      <div className="question-composer">
        <div className="question-identity">
          <span>Q01</span>
          <small>Primary research question</small>
        </div>
        <label className="visually-hidden" htmlFor="research-question">
          Research question
        </label>
        <textarea
          id="research-question"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
        />
        <div className="composer-actions">
          <ModeSwitch mode={mode} onChange={setMode} />
          <button
            className="primary-action"
            type="button"
            disabled={status === "running" || prompt.trim().length === 0}
            onClick={() => void begin()}
          >
            {status === "running" ? "Mapping…" : "Map question"}
          </button>
        </div>
      </div>

      <div className="mode-explanation">
        <span className="semantic-badge hypothesis">
          {mode === "guided" ? "Guided posture" : "Agentic posture"}
        </span>
        <p>
          {mode === "guided"
            ? "Petra pauses at consequential choices and explains why they matter."
            : "Petra advances low-risk work and surfaces decisions that require you."}
        </p>
        <span className="honesty-label">
          Interface preview · deterministic data
        </span>
      </div>

      <div className="workspace-titlebar">
        <div>
          <p className="eyebrow">Three synchronized views</p>
          <h2>Visible research workspace</h2>
        </div>
        <p>
          Graph structure, source evidence, and assistant activity share
          identity.
        </p>
      </div>

      <div className="three-view-workbench">
        <GraphPreview />
        <EvidencePreview />
        <AssistantPanel events={events} status={status} />
      </div>

      <footer className="research-principles">
        <span>
          <strong>Evidence-first</strong> Grounded in legitimate literature
        </span>
        <span>
          <strong>Inspectable</strong> Trace every claim
        </span>
        <span>
          <strong>Skeptical</strong> Search for alternatives
        </span>
        <span>
          <strong>Durable</strong> Preserve revisions and provenance
        </span>
      </footer>
    </section>
  );
};

const ProjectOverview = (): React.JSX.Element => {
  const { projectId } = useParams();
  return (
    <section className="object-page">
      <p className="eyebrow">Project · {projectId}</p>
      <h1>Research map</h1>
      <p className="lede narrow">
        This project scope will keep questions, hypotheses, literature,
        evidence, and decisions addressable without mixing them with another
        inquiry.
      </p>
      <div className="object-grid">
        <Link to="questions/Q01">
          <span className="object-code">Q01</span>
          <strong>Primary research question</strong>
          <small>Define what Petra is trying to distinguish.</small>
        </Link>
        <Link to="hypotheses/H01">
          <span className="object-code hypothesis-code">H01</span>
          <strong>Current working explanation</strong>
          <small>
            Track its descriptor, posture, and evidential obligations.
          </small>
        </Link>
        <Link to="evidence">
          <span className="object-code evidence-code">E</span>
          <strong>Evidence</strong>
          <small>Inspect claims, exact source spans, and reading depth.</small>
        </Link>
        <Link to="graph">
          <span className="object-code graph-code">G</span>
          <strong>Scientific graph</strong>
          <small>See competing explanations and every accepted edge.</small>
        </Link>
      </div>
    </section>
  );
};

const ObjectPage = (): React.JSX.Element => {
  const object = useLoaderData<{
    id: string;
    kind: string;
    projectId?: string;
  }>();
  const descriptor =
    object.kind === "hypothesis"
      ? "The current working explanation for the research question"
      : `Inspect the ${object.kind} record and its provenance.`;
  return (
    <section className="object-page">
      <p className="eyebrow">
        {object.kind} · {object.id}
      </p>
      <h1>
        {object.kind === "hypothesis"
          ? `${object.id} — ${descriptor}`
          : descriptor}
      </h1>
      <div className="empty-canvas">
        <RockMark />
        <p>This addressable view is ready for its M1 scientific objects.</p>
      </div>
    </section>
  );
};

const CollectionPage = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element => (
  <section className="object-page collection-page">
    <p className="eyebrow">Inspectable workspace</p>
    <h1>{title}</h1>
    <p className="lede narrow">{description}</p>
    <div className="collection-canvas">{children}</div>
  </section>
);

const RouteError = (): React.JSX.Element => (
  <main className="route-error">
    <RockMark />
    <h1>That research object is not available.</h1>
    <Link to="/">Return to the research brief</Link>
  </main>
);

export const router = createBrowserRouter([
  {
    path: "/",
    loader: loadHealth,
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <ResearchBrief /> },
      { path: "projects/:projectId", element: <ProjectOverview /> },
      {
        path: "projects/:projectId/questions/:questionId",
        loader: loadObject("question"),
        element: <ObjectPage />,
      },
      {
        path: "projects/:projectId/hypotheses/:hypothesisId",
        loader: loadObject("hypothesis"),
        element: <ObjectPage />,
      },
      {
        path: "projects/:projectId/papers/:paperId",
        loader: loadObject("paper"),
        element: <ObjectPage />,
      },
      {
        path: "projects/:projectId/work/:workId",
        loader: loadObject("work"),
        element: <ObjectPage />,
      },
      {
        path: "projects/:projectId/evidence",
        element: (
          <CollectionPage
            title="Evidence"
            description="Claims, exact source spans, processing depth, and review state meet here."
          >
            <EvidencePreview />
          </CollectionPage>
        ),
      },
      {
        path: "projects/:projectId/graph",
        element: (
          <CollectionPage
            title="Scientific graph"
            description="Questions, hypotheses, papers, claims, and competing explanations remain directly inspectable."
          >
            <GraphPreview />
          </CollectionPage>
        ),
      },
    ],
  },
]);

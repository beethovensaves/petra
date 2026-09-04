import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { SidebarCollapseIcon, SidebarExpandIcon } from "@primer/octicons-react";

import { PetraLockup, PetraMark } from "../design-system/brand.js";
import { FocusedGraph } from "../graph/FocusedGraph.js";
import {
  PetraButton,
  PetraDialog,
  PetraIconButton,
  PetraTabs,
  PetraTooltip,
  type PetraTab,
} from "../design-system/primitives.js";
import { StateMarker } from "../design-system/state.js";
import type {
  DetailsViewModel,
  EvidenceRowViewModel,
  ResearchShellViewModel,
  ShellObjectRef,
  ShellViewId,
} from "./model.js";
import "./research-shell.css";

type ShellTheme = "system" | "stone" | "graphite" | "contrast";
type LayoutPreset = "focus" | "review" | "graph" | "collaborate";

interface PanelLayout {
  map: number;
  details: number;
  assistant: number;
}

const PANEL_LIMITS = {
  map: { min: 176, max: 320 },
  details: { min: 304, max: 520 },
  assistant: { min: 240, max: 400 },
} as const;

const LAYOUT_PRESETS: Record<LayoutPreset, PanelLayout> = {
  focus: { map: 192, details: 320, assistant: 248 },
  review: { map: 216, details: 376, assistant: 272 },
  graph: { map: 184, details: 336, assistant: 248 },
  collaborate: { map: 192, details: 336, assistant: 352 },
};

const DEFAULT_LAYOUT = LAYOUT_PRESETS.review;
const SHELL_PREFERENCES_KEY = "petra.shell.preferences.v1";

interface ShellPreferences {
  theme: ShellTheme;
  layout: PanelLayout;
  activePreset: LayoutPreset | "custom";
  editorFontSize: number;
  editorLigatures: boolean;
  reducedMotion: boolean;
  mapCollapsed: boolean;
  assistantCollapsed: boolean;
}

const DEFAULT_PREFERENCES: ShellPreferences = {
  theme: "stone",
  layout: DEFAULT_LAYOUT,
  activePreset: "review",
  editorFontSize: 14,
  editorLigatures: false,
  reducedMotion: false,
  mapCollapsed: false,
  assistantCollapsed: true,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const readShellPreferences = (): ShellPreferences => {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SHELL_PREFERENCES_KEY) ?? "null",
    ) as Partial<ShellPreferences> | null;
    if (parsed === null) return DEFAULT_PREFERENCES;

    const themes: ShellTheme[] = ["system", "stone", "graphite", "contrast"];
    const presets: Array<LayoutPreset | "custom"> = [
      "focus",
      "review",
      "graph",
      "collaborate",
      "custom",
    ];
    const layout = parsed.layout ?? DEFAULT_LAYOUT;
    return {
      theme:
        parsed.theme !== undefined && themes.includes(parsed.theme)
          ? parsed.theme
          : DEFAULT_PREFERENCES.theme,
      layout: {
        map: clamp(
          layout.map ?? DEFAULT_LAYOUT.map,
          PANEL_LIMITS.map.min,
          PANEL_LIMITS.map.max,
        ),
        details: clamp(
          layout.details ?? DEFAULT_LAYOUT.details,
          PANEL_LIMITS.details.min,
          PANEL_LIMITS.details.max,
        ),
        assistant: clamp(
          layout.assistant ?? DEFAULT_LAYOUT.assistant,
          PANEL_LIMITS.assistant.min,
          PANEL_LIMITS.assistant.max,
        ),
      },
      activePreset:
        parsed.activePreset !== undefined &&
        presets.includes(parsed.activePreset)
          ? parsed.activePreset
          : "custom",
      editorFontSize: clamp(parsed.editorFontSize ?? 14, 12, 20),
      editorLigatures: parsed.editorLigatures ?? false,
      reducedMotion: parsed.reducedMotion ?? false,
      mapCollapsed: parsed.mapCollapsed ?? false,
      assistantCollapsed: parsed.assistantCollapsed ?? false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const ObjectIdentity = ({
  object,
  showId = false,
}: {
  object: ShellObjectRef;
  showId?: boolean;
}): React.JSX.Element => (
  <span className="shell-object-identity">
    <strong>{object.label}</strong>
    {object.descriptor === undefined ? null : <span>{object.descriptor}</span>}
    {showId ? (
      <code>
        {object.id}@{object.revision}
      </code>
    ) : null}
  </span>
);

const ContextItem = ({
  label,
  children,
  title,
}: {
  label: string;
  children: ReactNode;
  title?: string;
}): React.JSX.Element => (
  <div className="research-shell__context-item" title={title}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const PaneResizeHandle = ({
  label,
  controls,
  value,
  min,
  max,
  direction = 1,
  onChange,
}: {
  label: string;
  controls: string;
  value: number;
  min: number;
  max: number;
  direction?: 1 | -1;
  onChange: (value: number) => void;
}): React.JSX.Element => {
  const lastPointerX = useRef<number | null>(null);
  const liveValue = useRef(value);
  liveValue.current = value;

  const move = (delta: number): void => {
    const next = clamp(liveValue.current + delta * direction, min, max);
    liveValue.current = next;
    onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? 32 : 8;
    if (event.key === "ArrowLeft") move(-step);
    else if (event.key === "ArrowRight") move(step);
    else if (event.key === "Home") onChange(min);
    else if (event.key === "End") onChange(max);
    else return;
    event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (lastPointerX.current === null) return;
    const delta = event.clientX - lastPointerX.current;
    lastPointerX.current = event.clientX;
    move(delta);
  };

  return (
    <div
      className="shell-pane-resizer"
      role="separator"
      aria-label={label}
      aria-controls={controls}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} pixels`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        lastPointerX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        lastPointerX.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        lastPointerX.current = null;
      }}
    >
      <span aria-hidden="true" />
    </div>
  );
};

const CodeThemePreview = ({
  fontSize,
  ligatures,
}: {
  fontSize: number;
  ligatures: boolean;
}): React.JSX.Element => (
  <pre
    className="shell-settings__code-preview"
    style={
      {
        "--shell-code-size": `${fontSize}px`,
        fontVariantLigatures: ligatures ? "normal" : "none",
      } as CSSProperties
    }
    aria-label="Static syntax theme preview"
  >
    <code>
      <span className="code-token code-token--keyword">MATCH</span>{" "}
      <span className="code-token code-token--variable">(claim</span>
      <span className="code-token code-token--operator">:</span>
      <span className="code-token code-token--function">Claim</span>
      <span className="code-token code-token--variable">)</span>
      {"\n"}
      <span className="code-token code-token--keyword">WHERE</span>{" "}
      <span className="code-token code-token--property">claim.authority</span>{" "}
      <span className="code-token code-token--operator">=</span>{" "}
      <span className="code-token code-token--string">
        &quot;proposal&quot;
      </span>
      {"\n"}
      <span className="code-token code-token--keyword">RETURN</span>{" "}
      <span className="code-token code-token--property">claim.id</span>
      <span className="code-token code-token--operator">,</span>{" "}
      <span className="code-token code-token--property">claim.revision</span>{" "}
      <span className="code-token code-token--comment">// snapshot 18</span>
    </code>
  </pre>
);

const ShellSettings = ({
  open,
  theme,
  layout,
  activePreset,
  editorFontSize,
  editorLigatures,
  reducedMotion,
  onClose,
  onThemeChange,
  onLayoutChange,
  onPresetChange,
  onEditorFontSizeChange,
  onEditorLigaturesChange,
  onReducedMotionChange,
  onReset,
}: {
  open: boolean;
  theme: ShellTheme;
  layout: PanelLayout;
  activePreset: LayoutPreset | "custom";
  editorFontSize: number;
  editorLigatures: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  onThemeChange: (theme: ShellTheme) => void;
  onLayoutChange: (layout: PanelLayout) => void;
  onPresetChange: (preset: LayoutPreset) => void;
  onEditorFontSizeChange: (size: number) => void;
  onEditorLigaturesChange: (enabled: boolean) => void;
  onReducedMotionChange: (enabled: boolean) => void;
  onReset: () => void;
}): React.JSX.Element => {
  const [section, setSection] = useState("appearance");
  const themeOptions: Array<{
    id: ShellTheme;
    label: string;
    detail: string;
  }> = [
    { id: "system", label: "System", detail: "Follow the operating system." },
    { id: "stone", label: "Petra Stone", detail: "Warm, low-glare light." },
    {
      id: "graphite",
      label: "Petra Graphite",
      detail: "Dim, chromatic dark.",
    },
    {
      id: "contrast",
      label: "High Contrast",
      detail: "Stronger boundaries and focus.",
    },
  ];
  const presets: Array<{ id: LayoutPreset; label: string }> = [
    { id: "focus", label: "Focus" },
    { id: "review", label: "Review" },
    { id: "graph", label: "Graph" },
    { id: "collaborate", label: "Collaborate" },
  ];

  const tabs: PetraTab[] = [
    {
      id: "appearance",
      label: "Appearance",
      panel: (
        <fieldset className="shell-settings__fieldset">
          <legend>Color theme</legend>
          <p>
            Comfort-oriented surfaces with accessible text and focus contrast.
          </p>
          <div className="shell-settings__theme-grid">
            {themeOptions.map((option) => (
              <label
                key={option.id}
                className="shell-settings__theme-option"
                data-selected={theme === option.id || undefined}
              >
                <input
                  type="radio"
                  name="petra-theme"
                  value={option.id}
                  checked={theme === option.id}
                  onChange={() => onThemeChange(option.id)}
                />
                <span
                  className="shell-settings__theme-swatch"
                  data-theme={option.id}
                >
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </label>
            ))}
          </div>
        </fieldset>
      ),
    },
    {
      id: "layout",
      label: "Layout",
      panel: (
        <div className="shell-settings__stack">
          <fieldset className="shell-settings__fieldset">
            <legend>Workspace preset</legend>
            <p>
              Presets change presentation only. Scientific context is preserved.
            </p>
            <div className="shell-settings__preset-row">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={activePreset === preset.id}
                  onClick={() => onPresetChange(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="shell-settings__fieldset">
            <legend>Panel widths</legend>
            {(
              [
                ["map", "Research map"],
                ["details", "Details"],
                ["assistant", "Petra"],
              ] as const
            ).map(([key, label]) => (
              <label className="shell-settings__range" key={key}>
                <span>
                  <strong>{label}</strong>
                  <output>{layout[key]} px</output>
                </span>
                <input
                  type="range"
                  min={PANEL_LIMITS[key].min}
                  max={PANEL_LIMITS[key].max}
                  step="8"
                  value={layout[key]}
                  onChange={(event) =>
                    onLayoutChange({
                      ...layout,
                      [key]: Number(event.currentTarget.value),
                    })
                  }
                />
              </label>
            ))}
            <p className="shell-settings__hint">
              Pane dividers also support drag, touch, Arrow keys, Shift + Arrow,
              Home, and End.
            </p>
          </fieldset>
        </div>
      ),
    },
    {
      id: "editor",
      label: "Editor",
      panel: (
        <div className="shell-settings__stack">
          <label className="shell-settings__range">
            <span>
              <strong>Code text size</strong>
              <output>{editorFontSize} px</output>
            </span>
            <input
              type="range"
              min="12"
              max="20"
              step="1"
              value={editorFontSize}
              onChange={(event) =>
                onEditorFontSizeChange(Number(event.currentTarget.value))
              }
            />
          </label>
          <label className="shell-settings__check">
            <input
              type="checkbox"
              checked={editorLigatures}
              onChange={(event) =>
                onEditorLigaturesChange(event.currentTarget.checked)
              }
            />
            <span>
              <strong>Code ligatures</strong>
              <small>Off by default so operators remain literal.</small>
            </span>
          </label>
          <CodeThemePreview
            fontSize={editorFontSize}
            ligatures={editorLigatures}
          />
          <p className="shell-settings__hint">
            Static code and code editors use the same syntax theme.
          </p>
        </div>
      ),
    },
    {
      id: "accessibility",
      label: "Accessibility",
      panel: (
        <div className="shell-settings__stack">
          <label className="shell-settings__check">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) =>
                onReducedMotionChange(event.currentTarget.checked)
              }
            />
            <span>
              <strong>Reduce interface motion</strong>
              <small>The operating-system preference is always honored.</small>
            </span>
          </label>
          <section className="shell-settings__access-note">
            <strong>Zoom and reflow</strong>
            <p>
              Petra supports browser text enlargement and reflows panes into a
              sequential workspace at narrow effective widths.
            </p>
          </section>
          <section className="shell-settings__access-note">
            <strong>Contrast and forced colors</strong>
            <p>
              Status always includes text or a symbol. High Contrast and system
              forced-colors modes preserve focus and pane boundaries.
            </p>
            <PetraButton
              density="compact"
              onClick={() => onThemeChange("contrast")}
            >
              Use high contrast
            </PetraButton>
          </section>
        </div>
      ),
    },
  ];

  return (
    <PetraDialog
      open={open}
      title="Workspace settings"
      description="Changes apply immediately. Appearance, pane size, editor, and accessibility preferences do not change scientific state."
      onClose={onClose}
      footer={
        <>
          <PetraButton density="compact" variant="quiet" onClick={onReset}>
            Restore default settings
          </PetraButton>
          <PetraButton density="compact" variant="primary" onClick={onClose}>
            Close settings
          </PetraButton>
        </>
      }
    >
      <div className="shell-settings">
        <PetraTabs
          label="Workspace setting sections"
          tabs={tabs}
          selectedId={section}
          onSelect={setSection}
        />
      </div>
    </PetraDialog>
  );
};

const RelationshipView = ({
  details,
  onOpenGraph,
  expanded = false,
}: {
  details: DetailsViewModel;
  onOpenGraph?: () => void;
  expanded?: boolean;
}): React.JSX.Element => {
  const version = details.relationshipView.nodes.find(
    (node) => node.kind === "work_version",
  );
  const sourceSpan = details.relationshipView.nodes.find(
    (node) => node.kind === "source_span",
  );
  const assertion = details.relationshipView.nodes.find(
    (node) => node.kind === "assertion",
  );
  const claim = details.relationshipView.nodes.find(
    (node) => node.kind === "claim",
  );

  return (
    <figure
      className="shell-relationship"
      data-expanded={expanded || undefined}
      aria-labelledby="shell-relationship-title"
    >
      <figcaption>
        <div>
          <p>Task-bounded relationship view</p>
          <h3 id="shell-relationship-title">Source-to-Claim provenance</h3>
        </div>
        <PetraTooltip label="About this relationship view">
          This compact path explains only the selected Claim. It is not the
          complete project graph.
        </PetraTooltip>
      </figcaption>

      <div className="shell-relationship__diagram" aria-hidden="true">
        <span className="shell-relationship__node" data-node="version">
          {version?.label}
        </span>
        <span className="shell-relationship__node" data-node="span">
          {sourceSpan?.label}
        </span>
        <span className="shell-relationship__edge" data-edge="version">
          subject of ASSERTS ↓
        </span>
        <span className="shell-relationship__edge" data-edge="span">
          provenance for ↓
        </span>
        <span className="shell-relationship__node" data-node="assertion">
          {assertion?.label}
        </span>
        <span className="shell-relationship__edge" data-edge="claim">
          ASSERTS ↓
        </span>
        <span className="shell-relationship__node" data-node="claim">
          {claim?.label}
        </span>
      </div>

      <div className="shell-relationship__text">
        <h4>Text equivalent</h4>
        <ol>
          {details.relationshipView.textualPaths.map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ol>
      </div>

      {onOpenGraph === undefined ? null : (
        <PetraButton density="compact" onClick={onOpenGraph}>
          Open in graph
        </PetraButton>
      )}
    </figure>
  );
};

const DetailsPanel = ({
  details,
  onClose,
  onOpenGraph,
}: {
  details: DetailsViewModel;
  onClose: () => void;
  onOpenGraph: () => void;
}): React.JSX.Element => {
  const [selectedSection, setSelectedSection] = useState("overview");
  const tabs: PetraTab[] = [
    {
      id: "overview",
      label: "Overview",
      panel: (
        <div className="shell-details__section">
          <p className="shell-details__claim">{details.text}</p>
          <div className="shell-details__markers">
            {details.markers.map((marker) => (
              <StateMarker
                key={`${marker.dimension}:${marker.value}`}
                marker={marker}
              />
            ))}
          </div>
          <dl className="shell-details__facts">
            <div>
              <dt>Identity</dt>
              <dd>
                <code>
                  {details.object.id}@{details.object.revision}
                </code>
              </dd>
            </div>
            <div>
              <dt>Task scope</dt>
              <dd>{details.scope.task}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>{details.scope.outcome}</dd>
            </div>
            <div>
              <dt>Unreported</dt>
              <dd>{details.scope.unreported.join(", ")}</dd>
            </div>
          </dl>
        </div>
      ),
    },
    {
      id: "source",
      label: "Source",
      panel: (
        <div className="shell-details__section">
          <p className="shell-details__source-label">
            {details.source.versionLabel}
          </p>
          <blockquote>“{details.source.exactText}”</blockquote>
          <dl className="shell-details__facts">
            <div>
              <dt>Location</dt>
              <dd>{details.source.sectionPath}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{details.source.verification}</dd>
            </div>
            <div>
              <dt>SourceSpan</dt>
              <dd>
                <code>{details.source.sourceSpanId}</code>
              </dd>
            </div>
          </dl>
        </div>
      ),
    },
    {
      id: "relationships",
      label: "Relationships",
      panel: <RelationshipView details={details} onOpenGraph={onOpenGraph} />,
    },
    {
      id: "history",
      label: "History",
      panel: (
        <ol className="shell-details__history">
          {details.history.map((entry) => (
            <li key={`${entry.label}:${entry.at}`}>
              <strong>{entry.label}</strong>
              <time>{entry.at}</time>
              <p>{entry.detail}</p>
            </li>
          ))}
        </ol>
      ),
    },
  ];

  return (
    <aside
      className="shell-details"
      id="shell-details-panel"
      aria-labelledby="shell-details-title"
      data-testid="shell-details"
    >
      <header className="shell-details__header">
        <div>
          <p>Selected object</p>
          <h2 id="shell-details-title" tabIndex={-1}>
            Details
          </h2>
        </div>
        <PetraButton density="compact" variant="quiet" onClick={onClose}>
          Close details
        </PetraButton>
      </header>
      <ObjectIdentity object={details.object} showId />
      <PetraTabs
        label="Selected object details"
        tabs={tabs}
        selectedId={selectedSection}
        onSelect={setSelectedSection}
      />
    </aside>
  );
};

const EvidenceRow = ({
  row,
  onInspect,
}: {
  row: EvidenceRowViewModel;
  onInspect: () => void;
}): React.JSX.Element => (
  <button
    className="shell-evidence-row"
    type="button"
    aria-label={`View details for ${row.object.label}: ${row.text}`}
    onClick={onInspect}
  >
    <span className="shell-evidence-row__heading">
      <ObjectIdentity object={row.object} />
      <span className="shell-evidence-row__markers">
        {row.markers.map((marker) => (
          <StateMarker
            key={`${marker.dimension}:${marker.value}`}
            marker={marker}
          />
        ))}
      </span>
    </span>
    <strong>{row.text}</strong>
    <span>{row.scopeSummary}</span>
    <span className="shell-evidence-row__basis">
      {row.basisLabel} · <code>{row.basisId}</code>
    </span>
  </button>
);

const MainSurface = ({
  model,
  activeView,
  detailsOpen,
  detailsWidth,
  theme,
  onViewChange,
  onOpenDetails,
  onCloseDetails,
  onOpenGraph,
  onDetailsWidthChange,
}: {
  model: ResearchShellViewModel;
  activeView: ShellViewId;
  detailsOpen: boolean;
  detailsWidth: number;
  theme: ShellTheme;
  onViewChange: (view: ShellViewId) => void;
  onOpenDetails: () => void;
  onCloseDetails: () => void;
  onOpenGraph: () => void;
  onDetailsWidthChange: (width: number) => void;
}): React.JSX.Element => (
  <main
    className="research-shell__main"
    id="shell-main-view"
    tabIndex={-1}
    style={{ "--shell-details-width": `${detailsWidth}px` } as CSSProperties}
  >
    <header className="research-shell__main-header">
      <div>
        <p>Current view</p>
        <h1>{activeView === "graph" ? "Focused graph" : "Evidence"}</h1>
      </div>
      <div className="research-shell__selection">
        <span>Selected</span>
        <ObjectIdentity object={model.selectedObject} />
        {detailsOpen ? null : (
          <PetraButton
            id="shell-show-details"
            density="compact"
            onClick={onOpenDetails}
          >
            Show details
          </PetraButton>
        )}
      </div>
    </header>

    <nav className="research-shell__view-nav" aria-label="Research views">
      {model.views
        .filter((view) => view.availability === "ready")
        .map((view) => (
          <a
            key={view.id}
            href="#shell-main-view"
            aria-current={activeView === view.id ? "page" : undefined}
            onClick={() => onViewChange(view.id)}
          >
            {view.label}
          </a>
        ))}
    </nav>

    <div
      className="research-shell__main-grid"
      data-details-open={detailsOpen || undefined}
    >
      <section className="research-shell__surface" aria-live="polite">
        {activeView === "graph" ? (
          <div className="shell-graph-surface">
            <div className="shell-graph-surface__return">
              <span>Showing relationships for the selected Claim</span>
              <PetraButton
                density="compact"
                variant="quiet"
                onClick={() => onViewChange("evidence")}
              >
                Return to evidence
              </PetraButton>
            </div>
            <FocusedGraph model={model.focusedGraph} theme={theme} />
          </div>
        ) : (
          <div className="shell-evidence-surface">
            <header>
              <div>
                <p>Evidence for the selected Claim</p>
                <h2>Reported improvement</h2>
              </div>
              <span>1 claim</span>
            </header>
            <p className="shell-evidence-surface__intro">
              Review the Claim, its source basis, and its reported scope before
              applying it to trusted project data.
            </p>
            {model.evidenceRows.map((row) => (
              <EvidenceRow
                key={row.object.id}
                row={row}
                onInspect={onOpenDetails}
              />
            ))}
          </div>
        )}
      </section>

      {detailsOpen ? (
        <>
          <PaneResizeHandle
            label="Resize Details panel"
            controls="shell-details-panel"
            value={detailsWidth}
            min={PANEL_LIMITS.details.min}
            max={PANEL_LIMITS.details.max}
            direction={-1}
            onChange={onDetailsWidthChange}
          />
          <DetailsPanel
            details={model.details}
            onClose={onCloseDetails}
            onOpenGraph={onOpenGraph}
          />
        </>
      ) : null}
    </div>
  </main>
);

export const ResearchShell = ({
  model,
  initialView,
  initialTheme,
  initialLayout,
  initialAssistantCollapsed,
}: {
  model: ResearchShellViewModel;
  initialView?: ShellViewId;
  initialTheme?: ShellTheme;
  initialLayout?: PanelLayout;
  initialAssistantCollapsed?: boolean;
}): React.JSX.Element => {
  const storedPreferences = useRef(readShellPreferences()).current;
  const initialPreferences = useRef<ShellPreferences>({
    ...storedPreferences,
    theme: initialTheme ?? storedPreferences.theme,
    layout: initialLayout ?? storedPreferences.layout,
    assistantCollapsed:
      initialAssistantCollapsed ?? storedPreferences.assistantCollapsed,
  }).current;
  const [activeView, setActiveView] = useState<ShellViewId>(
    initialView ?? model.initialView,
  );
  const [detailsOpen, setDetailsOpen] = useState(
    (initialView ?? model.initialView) !== "graph",
  );
  const [assistantCollapsed, setAssistantCollapsed] = useState(
    initialPreferences.assistantCollapsed,
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(
    initialPreferences.mapCollapsed,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ShellTheme>(initialPreferences.theme);
  const [layout, setLayout] = useState<PanelLayout>(initialPreferences.layout);
  const [activePreset, setActivePreset] = useState<LayoutPreset | "custom">(
    initialPreferences.activePreset,
  );
  const [editorFontSize, setEditorFontSize] = useState(
    initialPreferences.editorFontSize,
  );
  const [editorLigatures, setEditorLigatures] = useState(
    initialPreferences.editorLigatures,
  );
  const [reducedMotion, setReducedMotion] = useState(
    initialPreferences.reducedMotion,
  );
  const [narrowLayout, setNarrowLayout] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 54rem)");
    const sync = (): void => setNarrowLayout(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const preferences: ShellPreferences = {
      theme,
      layout,
      activePreset,
      editorFontSize,
      editorLigatures,
      reducedMotion,
      mapCollapsed,
      assistantCollapsed,
    };
    try {
      window.localStorage.setItem(
        SHELL_PREFERENCES_KEY,
        JSON.stringify(preferences),
      );
    } catch {
      // The shell remains usable when browser storage is blocked.
    }
  }, [
    activePreset,
    assistantCollapsed,
    editorFontSize,
    editorLigatures,
    layout,
    mapCollapsed,
    reducedMotion,
    theme,
  ]);

  const focusElement = (id: string): void => {
    requestAnimationFrame(() => {
      document.getElementById(id)?.focus();
    });
  };

  const openGraph = (): void => {
    setActiveView("graph");
    setDetailsOpen(false);
    focusElement("shell-main-view");
  };

  const openDetails = (): void => {
    setDetailsOpen(true);
    focusElement("shell-details-title");
  };

  const closeDetails = (): void => {
    setDetailsOpen(false);
    focusElement("shell-show-details");
  };

  const openMap = (): void => {
    setMapCollapsed(false);
    setMapOpen(narrowLayout);
    requestAnimationFrame(() => {
      document
        .getElementById(narrowLayout ? "shell-map-close" : "shell-map-title")
        ?.focus();
    });
  };

  const closeMap = (): void => {
    setMapOpen(false);
    focusElement("shell-map-toggle");
  };

  const collapseMap = (): void => {
    setMapCollapsed(true);
    setMapOpen(false);
    focusElement("shell-map-toggle");
  };

  const handleMapKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (mapOpen && event.key === "Escape") {
      event.preventDefault();
      closeMap();
    }
  };

  const updateLayout = (next: PanelLayout): void => {
    setLayout(next);
    setActivePreset("custom");
  };

  const applyPreset = (preset: LayoutPreset): void => {
    setLayout(LAYOUT_PRESETS[preset]);
    setActivePreset(preset);
  };

  const resetWorkspace = (): void => {
    setTheme("stone");
    setLayout(DEFAULT_LAYOUT);
    setActivePreset("review");
    setEditorFontSize(14);
    setEditorLigatures(false);
    setReducedMotion(false);
    setMapCollapsed(false);
    setAssistantCollapsed(true);
  };

  const shellStyle = {
    "--shell-map-width": `${layout.map}px`,
    "--shell-assistant-width": `${layout.assistant}px`,
    "--shell-code-size": `${editorFontSize}px`,
  } as CSSProperties;
  const mapUnavailable = mapCollapsed || (narrowLayout && !mapOpen);

  return (
    <section
      className="research-shell"
      aria-label="Petra research workspace"
      data-petra-theme={theme}
      data-petra-reduced-motion={reducedMotion || undefined}
      data-map-collapsed={mapCollapsed || undefined}
      data-assistant-collapsed={assistantCollapsed || undefined}
      style={shellStyle}
    >
      <a
        className="research-shell__skip"
        href="#shell-main-view"
        onClick={() => focusElement("shell-main-view")}
      >
        Skip to current research view
      </a>
      <header className="research-shell__context">
        <div className="research-shell__context-brand">
          <PetraLockup variant="compact" />
          <PetraButton
            className="research-shell__map-toggle"
            id="shell-map-toggle"
            data-map-collapsed={mapCollapsed || undefined}
            density="compact"
            variant="quiet"
            aria-expanded={mapOpen}
            aria-controls="shell-research-map"
            onClick={mapOpen ? closeMap : openMap}
          >
            Research map
          </PetraButton>
        </div>
        <dl className="research-shell__context-list">
          <ContextItem
            label="Project"
            title={`${model.context.project.id}@${model.context.project.revision}`}
          >
            {model.context.project.name}
          </ContextItem>
          <ContextItem
            label="Active question"
            title={
              model.context.activeQuestion.descriptor ??
              "Question descriptor unavailable"
            }
          >
            {model.context.activeQuestion.label} ·{" "}
            {model.context.activeQuestion.descriptor ??
              "Question descriptor unavailable"}
          </ContextItem>
          <ContextItem label="Research snapshot">
            <span>{model.context.authorityRevision}</span>
          </ContextItem>
          <ContextItem
            label="Graph status"
            title={`${model.context.projectionLabel} · ${model.context.projectionDetail}`}
          >
            <StateMarker
              marker={{
                dimension: "work_freshness",
                value: "projection_catching_up",
                detail: `${model.context.projectionLabel}. ${model.context.projectionDetail}`,
              }}
            />
          </ContextItem>
          <ContextItem label="Review mode">
            <StateMarker
              marker={{
                dimension: "review_posture",
                value: model.context.reviewPosture,
              }}
            />
          </ContextItem>
        </dl>
        <div className="research-shell__context-actions">
          <PetraButton
            density="compact"
            variant="quiet"
            onClick={() => setAssistantCollapsed(false)}
          >
            Review requested work ({model.context.attentionWorkCount})
          </PetraButton>
          <PetraButton
            density="compact"
            variant="quiet"
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </PetraButton>
        </div>
      </header>

      <div className="research-shell__body">
        <aside
          className="research-shell__map"
          id="shell-research-map"
          data-open={mapOpen || undefined}
          data-collapsed={mapCollapsed || undefined}
          aria-label="Research map"
          aria-hidden={mapUnavailable || undefined}
          inert={mapUnavailable || undefined}
          onKeyDown={handleMapKeyDown}
        >
          <header>
            <div>
              <p>Project structure</p>
              <h2 id="shell-map-title" tabIndex={-1}>
                Research map
              </h2>
            </div>
            <PetraButton
              className="research-shell__map-close"
              id="shell-map-close"
              density="compact"
              variant="quiet"
              onClick={closeMap}
            >
              Close
            </PetraButton>
            <PetraIconButton
              className="research-shell__map-collapse"
              label="Hide research map"
              icon={<SidebarCollapseIcon />}
              variant="quiet"
              onClick={collapseMap}
            />
          </header>
          {model.researchMap.map((group) => (
            <section key={group.id} className="research-shell__map-group">
              <h3>
                {group.label}
                {group.count === undefined ? null : <span>{group.count}</span>}
              </h3>
              <ol>
                {group.items.map((item) => (
                  <li
                    key={item.object.id}
                    data-current={item.current || undefined}
                  >
                    <ObjectIdentity object={item.object} />
                    {item.status === undefined ? null : (
                      <small>{item.status}</small>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </aside>

        {mapOpen ? (
          <button
            className="research-shell__map-scrim"
            type="button"
            tabIndex={-1}
            aria-label="Close Research map"
            onClick={closeMap}
          />
        ) : null}

        {mapCollapsed ? null : (
          <PaneResizeHandle
            label="Resize Research map"
            controls="shell-research-map"
            value={layout.map}
            min={PANEL_LIMITS.map.min}
            max={PANEL_LIMITS.map.max}
            onChange={(map) => updateLayout({ ...layout, map })}
          />
        )}

        <MainSurface
          model={model}
          activeView={activeView}
          detailsOpen={detailsOpen}
          detailsWidth={layout.details}
          theme={theme}
          onViewChange={setActiveView}
          onOpenDetails={openDetails}
          onCloseDetails={closeDetails}
          onOpenGraph={openGraph}
          onDetailsWidthChange={(details) =>
            updateLayout({ ...layout, details })
          }
        />

        {assistantCollapsed ? null : (
          <PaneResizeHandle
            label="Resize Petra panel"
            controls="shell-assistant-panel"
            value={layout.assistant}
            min={PANEL_LIMITS.assistant.min}
            max={PANEL_LIMITS.assistant.max}
            direction={-1}
            onChange={(assistant) => updateLayout({ ...layout, assistant })}
          />
        )}

        <aside
          className="research-shell__assistant"
          id="shell-assistant-panel"
          aria-label="Petra agent activity"
        >
          <header>
            {assistantCollapsed ? (
              <PetraMark label="Petra" />
            ) : (
              <div className="research-shell__assistant-title">
                <PetraMark aria-hidden="true" />
                <div>
                  <p>Agent activity</p>
                  <h2>Petra</h2>
                </div>
              </div>
            )}
            <PetraIconButton
              label={
                assistantCollapsed
                  ? "Expand Petra panel"
                  : "Collapse Petra panel"
              }
              icon={
                assistantCollapsed ? (
                  <SidebarExpandIcon />
                ) : (
                  <SidebarCollapseIcon />
                )
              }
              variant="quiet"
              aria-expanded={!assistantCollapsed}
              onClick={() => setAssistantCollapsed((collapsed) => !collapsed)}
            />
          </header>
          {assistantCollapsed ? (
            <span
              className="research-shell__assistant-attention"
              title="One requested work item"
            >
              1
            </span>
          ) : (
            <div className="research-shell__assistant-body">
              <section className="research-shell__assistant-scope">
                <div>
                  <p className="research-shell__assistant-label">
                    Current mode
                  </p>
                  <StateMarker
                    marker={{
                      dimension: "review_posture",
                      value: model.context.reviewPosture,
                    }}
                  />
                </div>
                <p>{model.assistant.capabilitySummary}</p>
              </section>
              <section>
                <p className="research-shell__assistant-label">
                  Selected context
                </p>
                <ObjectIdentity
                  object={model.assistant.selectedContext}
                  showId
                />
              </section>
              <section className="research-shell__assistant-message">
                <span>Explanation</span>
                <p>{model.assistant.message}</p>
              </section>
              <section className="research-shell__assistant-work">
                <div>
                  <p className="research-shell__assistant-label">Active work</p>
                  <strong>{model.assistant.work.status}</strong>
                </div>
                <p>{model.assistant.work.objective}</p>
                <code>{model.assistant.work.workUnitId}</code>
                <time>{model.assistant.work.updatedAt}</time>
                <ol className="research-shell__assistant-timeline">
                  {model.assistant.activity.map((event) => (
                    <li key={event.label} data-state={event.state}>
                      <span aria-hidden="true" />
                      <div>
                        <strong>{event.label}</strong>
                        <p>{event.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <p className="research-shell__assistant-boundary">
                Agent explanations do not change trusted project data. Review is
                required before applying a proposal.
              </p>
            </div>
          )}
        </aside>
      </div>
      <ShellSettings
        open={settingsOpen}
        theme={theme}
        layout={layout}
        activePreset={activePreset}
        editorFontSize={editorFontSize}
        editorLigatures={editorLigatures}
        reducedMotion={reducedMotion}
        onClose={() => setSettingsOpen(false)}
        onThemeChange={setTheme}
        onLayoutChange={updateLayout}
        onPresetChange={applyPreset}
        onEditorFontSizeChange={setEditorFontSize}
        onEditorLigaturesChange={setEditorLigatures}
        onReducedMotionChange={setReducedMotion}
        onReset={resetWorkspace}
      />
    </section>
  );
};

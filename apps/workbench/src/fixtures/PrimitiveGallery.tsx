import {
  ArrowRightIcon,
  BeakerIcon,
  CheckIcon,
  ChevronDownIcon,
  GearIcon,
  GraphIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@primer/octicons-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { PetraLockup } from "../design-system/brand.js";
import {
  PetraButton,
  PetraButtonGroup,
  PetraDialog,
  PetraEmptyState,
  PetraIconButton,
  PetraLink,
  PetraTabs,
  PetraTextArea,
  PetraTextField,
  PetraTooltip,
  type PetraTab,
} from "../design-system/primitives.js";
import { StateNotice } from "../design-system/state.js";
import "./fixture-gallery.css";
import "./primitive-gallery.css";

const DETAIL_TABS: PetraTab[] = [
  {
    id: "summary",
    label: "Summary",
    panel: (
      <p>
        The source reports a population-specific effect. Petra has not applied a
        general relation to the trusted graph.
      </p>
    ),
  },
  {
    id: "sources",
    label: "Sources · 3",
    panel: (
      <p>
        Three exact source spans are available from two full-text versions and
        one abstract-only record.
      </p>
    ),
  },
  {
    id: "history",
    label: "History",
    panel: (
      <p>
        The current wording was revised after scope review. No scientific
        authority change occurred.
      </p>
    ),
  },
];

const PrimitiveSection = ({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}): React.JSX.Element => (
  <section
    className="primitive-section"
    id={id}
    aria-labelledby={`${id}-title`}
  >
    <header className="primitive-section__header">
      <p>{eyebrow}</p>
      <h2 id={`${id}-title`}>{title}</h2>
      <span>{description}</span>
    </header>
    <div className="primitive-section__body">{children}</div>
  </section>
);

export const PrimitiveGallery = (): React.JSX.Element => {
  const [selectedTab, setSelectedTab] = useState("summary");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [theme, setTheme] = useState<"stone" | "graphite" | "contrast">(
    "stone",
  );
  const colorMode = theme === "graphite" ? "dark" : "light";
  const lightTheme = theme === "contrast" ? "light_high_contrast" : "light";

  return (
    <div
      className="foundation-gallery primitive-gallery"
      data-petra-theme={theme}
      data-color-mode={colorMode}
      data-light-theme={lightTheme}
      data-dark-theme="dark_dimmed"
    >
      <a className="foundation-gallery__skip" href="#primitive-content">
        Skip to primitive content
      </a>
      <header className="foundation-gallery__masthead">
        <PetraLockup className="foundation-gallery__brand" variant="compact" />
        <div>
          <p className="foundation-gallery__kicker">Petra interface system</p>
          <h1>Clear controls for consequential research</h1>
          <p>
            A calm, IDE-like foundation for evidence, provenance, review, and
            long-running work.
          </p>
        </div>
        <nav aria-label="Fixture destinations">
          <Link to="/__fixtures/shell">Shell fixture</Link>
          <Link to="/__fixtures/foundation">State fixtures</Link>
          <Link to="/__fixtures/brand">Brand fixtures</Link>
          <Link to="/">Return to workbench</Link>
        </nav>
      </header>

      <div className="primitive-gallery__theme-bar">
        <span>Preview theme</span>
        <PetraButtonGroup label="Preview theme">
          <PetraButton
            density="compact"
            aria-pressed={theme === "stone"}
            onClick={() => setTheme("stone")}
          >
            Stone
          </PetraButton>
          <PetraButton
            density="compact"
            aria-pressed={theme === "graphite"}
            onClick={() => setTheme("graphite")}
          >
            Graphite
          </PetraButton>
          <PetraButton
            density="compact"
            aria-pressed={theme === "contrast"}
            onClick={() => setTheme("contrast")}
          >
            High contrast
          </PetraButton>
        </PetraButtonGroup>
      </div>

      <nav className="foundation-gallery__nav" aria-label="Primitive sections">
        <PetraLink density="compact" href="#primitive-type">
          Typography
        </PetraLink>
        <PetraLink density="compact" href="#primitive-actions">
          Actions
        </PetraLink>
        <PetraLink density="compact" href="#primitive-fields">
          Fields
        </PetraLink>
        <PetraLink density="compact" href="#primitive-navigation">
          Navigation
        </PetraLink>
        <PetraLink density="compact" href="#primitive-feedback">
          Feedback
        </PetraLink>
      </nav>

      <main id="primitive-content" tabIndex={-1}>
        <PrimitiveSection
          id="primitive-type"
          eyebrow="Typography"
          title="Hierarchy comes from roles, not decoration"
          description="Inter carries product language; JetBrains Mono carries identifiers and code; Bebas Neue remains exclusive to the PETRA wordmark."
        >
          <div className="primitive-type-ramp">
            <div data-role="page">
              <span>Page title</span>
              <strong>Evidence review</strong>
            </div>
            <div data-role="section">
              <span>Section title</span>
              <strong>Claims needing attention</strong>
            </div>
            <div data-role="body">
              <span>Body</span>
              <p>
                Compare the proposed Claim with its exact source passage and
                reported scope before applying a change.
              </p>
            </div>
            <div data-role="identifier">
              <span>Identifier</span>
              <code>claim_01ARZ3NDEKTSV4RRFFQ69G5FAV@3</code>
            </div>
          </div>
        </PrimitiveSection>

        <PrimitiveSection
          id="primitive-actions"
          eyebrow="Comfortable actions"
          title="Outcome-first controls"
          description="Primary, secondary, quiet, destructive, busy, and unavailable states use text as well as treatment."
        >
          <div className="primitive-sample">
            <h3>Available actions</h3>
            <div className="primitive-actions">
              <PetraButton variant="primary" leadingVisual={<PlusIcon />}>
                Add paper
              </PetraButton>
              <PetraButton
                leadingVisual={<SearchIcon />}
                trailingVisual={<ArrowRightIcon />}
              >
                Compare evidence
              </PetraButton>
              <PetraButton variant="quiet" leadingVisual={<GraphIcon />}>
                View provenance
              </PetraButton>
              <PetraButton
                variant="danger"
                leadingVisual={<TrashIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Remove saved view
              </PetraButton>
            </div>
          </div>

          <div className="primitive-sample">
            <h3>Compact toolbar</h3>
            <div
              className="primitive-toolbar"
              role="toolbar"
              aria-label="Evidence tools"
            >
              <PetraIconButton label="Search evidence" icon={<SearchIcon />} />
              <PetraIconButton label="Open graph" icon={<GraphIcon />} />
              <PetraButton
                density="compact"
                leadingVisual={<CheckIcon />}
                trailingVisual={<ChevronDownIcon />}
              >
                Review
              </PetraButton>
              <PetraIconButton label="Workspace settings" icon={<GearIcon />} />
            </div>
          </div>

          <div className="primitive-sample">
            <h3>Operational and limited states</h3>
            <div className="primitive-actions primitive-actions--aligned-start">
              <PetraButton busy busyLabel="Checking sources…">
                Check sources
              </PetraButton>
              <PetraButton
                variant="primary"
                unavailable={{
                  reason:
                    "This paper is available only as an abstract, so Petra cannot inspect its methods.",
                  prerequisite:
                    "Attach a permitted full-text version before generating a method synthesis.",
                }}
              >
                Generate method synthesis
              </PetraButton>
            </div>
          </div>

          <PetraDialog
            open={dialogOpen}
            title="Remove “Methods comparison”?"
            description="This removes the saved view from your workspace. It does not change papers, Claims, or the research snapshot."
            onClose={() => setDialogOpen(false)}
            footer={
              <>
                <PetraButton onClick={() => setDialogOpen(false)}>
                  Keep saved view
                </PetraButton>
                <PetraButton
                  variant="danger"
                  onClick={() => setDialogOpen(false)}
                >
                  Remove saved view
                </PetraButton>
              </>
            }
          >
            <p>
              You can create this view again, but Petra cannot restore its
              current layout automatically.
            </p>
          </PetraDialog>
        </PrimitiveSection>

        <PrimitiveSection
          id="primitive-fields"
          eyebrow="Comfortable forms"
          title="Labels, help, and correction stay adjacent"
          description="Hints describe valid input before entry; errors identify the correction after validation."
        >
          <div className="primitive-form">
            <PetraTextField
              label="Project name"
              hint="Use a stable name researchers will recognize across snapshots."
              defaultValue="Replication and position bias"
              required
            />
            <PetraTextField
              label="Saved view name"
              hint="Between 4 and 60 characters."
              defaultValue="H1"
              error="Enter at least 4 characters so this view remains distinguishable."
            />
            <PetraTextArea
              label="Research question"
              hint="Keep the researcher's wording. Petra may propose a structured version separately."
              defaultValue="When does position bias persist after replication?"
              required
            />
          </div>
        </PrimitiveSection>

        <PrimitiveSection
          id="primitive-navigation"
          eyebrow="Compact navigation"
          title="Selection remains textual and keyboard-operable"
          description="Arrow keys move among tabs; the active panel remains a separate focus destination."
        >
          <div className="primitive-navigation-layout">
            <nav className="primitive-action-list" aria-label="Research views">
              <a href="#primitive-navigation" aria-current="page">
                <BeakerIcon size={16} aria-hidden="true" />
                <span>Evidence</span>
                <small>12</small>
              </a>
              <a href="#primitive-navigation">
                <GraphIcon size={16} aria-hidden="true" />
                <span>Graph</span>
              </a>
              <a href="#primitive-navigation">
                <SearchIcon size={16} aria-hidden="true" />
                <span>Papers</span>
              </a>
            </nav>
            <div className="primitive-navigation-demo">
              <div className="primitive-inline-label">
                <span>Claim details</span>
                <PetraTooltip label="About snapshot freshness">
                  Freshness identifies the snapshot behind this view. It is not
                  a scientific confidence score.
                </PetraTooltip>
              </div>
              <PetraTabs
                label="Claim details"
                tabs={DETAIL_TABS}
                selectedId={selectedTab}
                onSelect={setSelectedTab}
              />
            </div>
          </div>
        </PrimitiveSection>

        <PrimitiveSection
          id="primitive-feedback"
          eyebrow="Feedback and absence"
          title="State, reason, and recovery travel together"
          description="Notices and empty states avoid implying science or capability that Petra does not have."
        >
          <div className="primitive-feedback-grid">
            <StateNotice
              notice={{
                tone: "information",
                title: "Viewing a cached synthesis",
                message:
                  "This synthesis was produced from snapshot 018 and has not been recomputed for the current snapshot.",
                recovery: "Recompute it before using it in a new draft.",
              }}
            />
            <StateNotice
              notice={{
                tone: "danger",
                title: "Source inspection failed",
                message:
                  "Petra retained the completed metadata and abstract. No method-level extraction was applied.",
                recovery:
                  "Retry source inspection or continue with the visible abstract-only limitation.",
              }}
            />
            <PetraEmptyState
              title="No papers are attached yet"
              description="The project can hold a research question before any source is added."
              detail="Add a paper to begin source-grounded evidence work."
              actions={
                <PetraButton variant="primary" leadingVisual={<PlusIcon />}>
                  Add paper
                </PetraButton>
              }
            />
            <PetraEmptyState
              tone="danger"
              title="This saved view cannot be restored"
              description="Its referenced snapshot is no longer available in this local project."
              detail="Return to the current Research Brief; no trusted graph state was changed."
              actions={
                <PetraLink href="#primitive-navigation">
                  Return to details
                </PetraLink>
              }
            />
          </div>
        </PrimitiveSection>
      </main>

      <footer className="foundation-gallery__footer">
        <p>
          Review fixture: controls demonstrate presentation and interaction
          behavior only. They do not issue Petra commands or change scientific
          authority.
        </p>
      </footer>
    </div>
  );
};

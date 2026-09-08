import { Link, useParams } from "react-router";

import { PetraLockup } from "../design-system/brand.js";
import {
  AvailabilityNote,
  EvidenceRelationLine,
  FreshnessStamp,
  OriginLabel,
  SourceDepthFlag,
  StateGroup,
  StateNotice,
  WorkActivity,
} from "../design-system/state.js";
import {
  FOUNDATION_FIXTURES,
  getFoundationFixture,
  type FoundationFixture,
} from "./foundation.js";
import "./fixture-gallery.css";

const FixtureContent = ({
  fixture,
}: {
  fixture: FoundationFixture;
}): React.JSX.Element => (
  <article
    className="foundation-fixture"
    id={`fixture-${fixture.id}`}
    aria-labelledby={`fixture-${fixture.id}-title`}
    aria-busy={fixture.pressure === "loading"}
  >
    <header className="foundation-fixture__header">
      <div>
        <p className="foundation-fixture__identity">
          <code>{fixture.scenarioId}</code>
          <span>{fixture.pressure.replaceAll("_", " ")}</span>
        </p>
        <h2 id={`fixture-${fixture.id}-title`}>{fixture.title}</h2>
        <p>{fixture.summary}</p>
      </div>
      <span
        className="foundation-fixture__contract"
        data-contract-status={fixture.contractStatus}
      >
        {fixture.contractStatus === "mapped"
          ? "Mapped contract fields"
          : "Presentation-only state"}
      </span>
    </header>

    {fixture.pressure === "loading" ? (
      <div className="foundation-fixture__loading" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    ) : null}

    <div className="foundation-fixture__grid">
      {fixture.markers.length === 0 ? null : (
        <StateGroup
          label="Visible state distinctions"
          markers={fixture.markers}
        />
      )}
      {fixture.notice === undefined ? null : (
        <StateNotice notice={fixture.notice} />
      )}
      {fixture.freshness === undefined ? null : (
        <FreshnessStamp freshness={fixture.freshness} />
      )}
      {fixture.origin === undefined ? null : (
        <OriginLabel origin={fixture.origin} />
      )}
      {fixture.relation === undefined ? null : (
        <EvidenceRelationLine relation={fixture.relation} />
      )}
      {fixture.sourceDepth === undefined ? null : (
        <SourceDepthFlag source={fixture.sourceDepth} />
      )}
      {fixture.work === undefined ? null : <WorkActivity work={fixture.work} />}
      {fixture.availability === undefined ? null : (
        <AvailabilityNote availability={fixture.availability} />
      )}
    </div>

    <footer className="foundation-fixture__sources">
      <strong>Fixture basis</strong>
      <ul>
        {fixture.contractRefs.map((reference) => (
          <li key={reference}>{reference}</li>
        ))}
      </ul>
    </footer>
  </article>
);

export const FoundationGallery = (): React.JSX.Element => {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const selectedFixture = getFoundationFixture(fixtureId);
  const fixtures =
    selectedFixture === undefined ? FOUNDATION_FIXTURES : [selectedFixture];
  const unknownFixture =
    fixtureId !== undefined && selectedFixture === undefined;

  return (
    <div className="foundation-gallery">
      <a
        className="foundation-gallery__skip"
        href="#foundation-fixture-content"
      >
        Skip to fixture content
      </a>
      <header className="foundation-gallery__masthead">
        <PetraLockup className="foundation-gallery__brand" variant="compact" />
        <div>
          <p className="foundation-gallery__kicker">
            UX1.0 · Design foundations
          </p>
          <h1>State and fixture grammar</h1>
          <p>
            Deterministic presentation fixtures for authority, freshness,
            origin, evidence relations, source depth, work outcomes, and
            availability.
          </p>
        </div>
        <nav aria-label="Fixture destinations">
          <Link to="/__fixtures/shell">Shell fixture</Link>
          <Link to="/__fixtures/primitives">Primitive fixtures</Link>
          <Link to="/__fixtures/brand">Brand fixtures</Link>
          <Link to="/">Return to workbench</Link>
        </nav>
      </header>

      <nav className="foundation-gallery__nav" aria-label="Foundation fixtures">
        <Link
          className={fixtureId === undefined ? "active" : ""}
          aria-current={fixtureId === undefined ? "page" : undefined}
          to="/__fixtures/foundation"
        >
          All fixtures
        </Link>
        {FOUNDATION_FIXTURES.map((fixture) => (
          <Link
            key={fixture.id}
            className={fixtureId === fixture.id ? "active" : ""}
            aria-current={fixtureId === fixture.id ? "page" : undefined}
            to={`/__fixtures/foundation/${fixture.id}`}
          >
            {fixture.pressure.replaceAll("_", " ")}
          </Link>
        ))}
      </nav>

      <main id="foundation-fixture-content" tabIndex={-1}>
        {unknownFixture ? (
          <StateNotice
            notice={{
              tone: "danger",
              title: "Fixture not found",
              message: `“${fixtureId}” is not a registered UX1.0 foundation fixture.`,
              recovery:
                "Choose a registered fixture from the gallery navigation.",
            }}
          />
        ) : (
          fixtures.map((fixture) => (
            <FixtureContent key={fixture.id} fixture={fixture} />
          ))
        )}
      </main>

      <footer className="foundation-gallery__footer">
        <p>
          Fixture data is deterministic. Mapped examples identify their accepted
          Petra contracts; interface-only loading and empty states are labeled
          as presentation state and cannot become scientific authority.
        </p>
      </footer>
    </div>
  );
};

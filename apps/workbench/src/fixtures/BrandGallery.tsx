import { Link } from "react-router";

import {
  PetraLockup,
  PetraMark,
  PetraWordmark,
  type PetraBrandTone,
} from "../design-system/brand.js";
import "./brand-gallery.css";

const MARK_SIZES = [16, 24, 32, 48, 64, 96] as const;

const ScaleRow = ({ tone }: { tone: PetraBrandTone }): React.JSX.Element => (
  <div className="brand-gallery__scale" data-tone={tone}>
    {MARK_SIZES.map((size) => (
      <figure key={size}>
        <div className="brand-gallery__scale-stage">
          <PetraMark
            label={`Petra rock mark at ${size} pixels`}
            size={`${size}px`}
            tone={tone}
          />
        </div>
        <figcaption>{size}px</figcaption>
      </figure>
    ))}
  </div>
);

export const BrandGallery = (): React.JSX.Element => (
  <div className="brand-gallery">
    <a className="brand-gallery__skip" href="#brand-fixture-content">
      Skip to brand fixtures
    </a>

    <header className="brand-gallery__header">
      <PetraLockup variant="compact" />
      <div>
        <p className="brand-gallery__kicker">UX1.0 · Production identity</p>
        <h1>Rock, wordmark, and lockup grammar</h1>
        <p>
          Code-native treatments derived from the selected black-rock reference,
          with Bebas Neue reserved for the PETRA wordmark.
        </p>
      </div>
      <nav aria-label="Fixture destinations">
        <Link to="/__fixtures/shell">Shell fixture</Link>
        <Link to="/__fixtures/primitives">Primitive fixtures</Link>
        <Link to="/__fixtures/foundation">State fixtures</Link>
        <Link to="/">Return to workbench</Link>
      </nav>
    </header>

    <main id="brand-fixture-content" tabIndex={-1}>
      <section aria-labelledby="brand-lockups-title">
        <header className="brand-gallery__section-heading">
          <div>
            <p className="brand-gallery__kicker">Lockups</p>
            <h2 id="brand-lockups-title">One mark, three explicit roles</h2>
          </div>
          <p>
            Compact product chrome omits the tagline. Horizontal and stacked
            treatments are reserved for entry, brand, and presentation surfaces.
          </p>
        </header>

        <div className="brand-gallery__lockups">
          <article className="brand-gallery__lockup-card">
            <p>Compact application header</p>
            <PetraLockup variant="compact" />
            <small>
              No tagline · mark remains decorative beside visible text
            </small>
          </article>

          <article className="brand-gallery__lockup-card brand-gallery__lockup-card--wide">
            <p>Horizontal brand surface</p>
            <PetraLockup variant="horizontal" showTagline />
          </article>

          <article className="brand-gallery__lockup-card brand-gallery__lockup-card--stacked">
            <p>Stacked entry surface</p>
            <PetraLockup variant="stacked" showTagline />
          </article>

          <article className="brand-gallery__lockup-card brand-gallery__lockup-card--dark">
            <p>Reversed brand surface</p>
            <PetraLockup tone="on_dark" variant="horizontal" showTagline />
          </article>
        </div>
      </section>

      <section aria-labelledby="brand-scale-title">
        <header className="brand-gallery__section-heading">
          <div>
            <p className="brand-gallery__kicker">Scale pressure</p>
            <h2 id="brand-scale-title">Silhouette first, facets second</h2>
          </div>
          <p>
            The silhouette carries recognition at the smallest sizes. Internal
            cuts become deliberately clearer as navigation and brand scale
            allow.
          </p>
        </header>

        <ScaleRow tone="on_light" />
        <ScaleRow tone="on_dark" />
      </section>

      <section aria-labelledby="brand-usage-title">
        <header className="brand-gallery__section-heading">
          <div>
            <p className="brand-gallery__kicker">Usage boundary</p>
            <h2 id="brand-usage-title">Identity without logo saturation</h2>
          </div>
          <PetraWordmark />
        </header>

        <div className="brand-gallery__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Surface</th>
                <th scope="col">Treatment</th>
                <th scope="col">Tagline</th>
                <th scope="col">Rule</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Application header</th>
                <td>Compact lockup</td>
                <td>Omit</td>
                <td>One home link; no additional decorative logo nearby.</td>
              </tr>
              <tr>
                <th scope="row">Navigation and assistant identity</th>
                <td>Rock only</td>
                <td>Omit</td>
                <td>Use only where the role is already named or accessible.</td>
              </tr>
              <tr>
                <th scope="row">Entry and presentation</th>
                <td>Horizontal or stacked lockup</td>
                <td>Optional</td>
                <td>Maintain calm clear space; do not add graph decoration.</td>
              </tr>
              <tr>
                <th scope="row">Loading</th>
                <td>Rock only</td>
                <td>Omit</td>
                <td>Keep motion nonessential and honor reduced motion.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer className="brand-gallery__footer">
      The source brand board remains a reference artifact. These components are
      the production implementation boundary and keep the mark adaptable to
      light and dark Petra surfaces.
    </footer>
  </div>
);

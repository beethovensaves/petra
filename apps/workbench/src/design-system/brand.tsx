import type { CSSProperties, ImgHTMLAttributes } from "react";

import petraRockReferenceUrl from "../assets/brand/petra-rock-reference.png";
import "./brand.css";

export type PetraBrandTone = "on_light" | "on_dark";
export type PetraLockupVariant = "compact" | "horizontal" | "stacked";

export interface PetraMarkProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src"
> {
  label?: string;
  size?: CSSProperties["width"];
  tone?: PetraBrandTone;
}

const joinClassNames = (...names: Array<string | undefined>): string =>
  names.filter((name): name is string => name !== undefined).join(" ");

export const PetraMark = ({
  className,
  label,
  size,
  style,
  tone = "on_light",
  ...props
}: PetraMarkProps): React.JSX.Element => (
  <img
    {...props}
    className={joinClassNames("petra-mark", className)}
    data-tone={tone}
    data-brand-element="rock-mark"
    role={label === undefined ? undefined : "img"}
    aria-hidden={label === undefined ? true : undefined}
    alt={label ?? ""}
    draggable="false"
    src={petraRockReferenceUrl}
    style={{ ...style, width: size ?? style?.width }}
  />
);

export const PetraWordmark = ({
  className,
}: {
  className?: string;
}): React.JSX.Element => (
  <span
    className={joinClassNames("petra-wordmark", className)}
    data-brand-element="wordmark"
  >
    PETRA
  </span>
);

export const PetraLockup = ({
  className,
  showTagline = false,
  tone = "on_light",
  variant = "compact",
}: {
  className?: string;
  showTagline?: boolean;
  tone?: PetraBrandTone;
  variant?: PetraLockupVariant;
}): React.JSX.Element => (
  <span
    className={joinClassNames("petra-lockup", className)}
    data-tone={tone}
    data-variant={variant}
  >
    <PetraMark tone={tone} />
    <span className="petra-lockup__copy">
      <PetraWordmark />
      {showTagline ? (
        <span className="petra-lockup__tagline">
          Where hypotheses earn their edges.
        </span>
      ) : null}
    </span>
  </span>
);

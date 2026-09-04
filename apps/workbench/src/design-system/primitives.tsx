import {
  useEffect,
  useId,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { AlertIcon, InfoIcon, XIcon } from "@primer/octicons-react";

import "./primitives.css";

export type ControlDensity = "compact" | "comfortable";
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export interface ActionUnavailable {
  reason: string;
  prerequisite?: string;
}

export interface PetraButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> {
  variant?: ButtonVariant;
  density?: ControlDensity;
  busy?: boolean;
  busyLabel?: string;
  unavailable?: ActionUnavailable;
  leadingVisual?: ReactNode;
  trailingVisual?: ReactNode;
}

const joinIds = (...ids: Array<string | undefined>): string | undefined => {
  const presentIds = ids.filter((id): id is string => id !== undefined);
  return presentIds.length === 0 ? undefined : presentIds.join(" ");
};

export const PetraButton = ({
  variant = "secondary",
  density = "comfortable",
  busy = false,
  busyLabel,
  unavailable,
  leadingVisual,
  trailingVisual,
  className,
  children,
  onClick,
  type = "button",
  ...buttonProps
}: PetraButtonProps): React.JSX.Element => {
  const noteId = useId();
  const inactive = busy || unavailable !== undefined;
  const describedBy = joinIds(
    buttonProps["aria-describedby"],
    unavailable === undefined ? undefined : noteId,
  );

  return (
    <span className="petra-action">
      <button
        {...buttonProps}
        className={[
          "petra-button",
          `petra-button--${variant}`,
          `petra-control--${density}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        type={type}
        aria-busy={busy || undefined}
        aria-disabled={inactive || undefined}
        aria-describedby={describedBy}
        onClick={(event) => {
          if (inactive) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        {busy ? (
          <span className="petra-button__spinner" aria-hidden="true" />
        ) : leadingVisual === undefined ? null : (
          <span className="petra-button__visual" aria-hidden="true">
            {leadingVisual}
          </span>
        )}
        <span className="petra-button__label">
          {busy ? (busyLabel ?? children) : children}
        </span>
        {busy || trailingVisual === undefined ? null : (
          <span className="petra-button__visual" aria-hidden="true">
            {trailingVisual}
          </span>
        )}
      </button>
      {unavailable === undefined ? null : (
        <span className="petra-action__note" id={noteId}>
          <strong>Unavailable:</strong> {unavailable.reason}
          {unavailable.prerequisite === undefined ? null : (
            <span>
              <strong>Prerequisite:</strong> {unavailable.prerequisite}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

export interface PetraIconButtonProps extends Omit<
  PetraButtonProps,
  "children" | "leadingVisual" | "trailingVisual" | "busyLabel"
> {
  label: string;
  icon: ReactNode;
}

export const PetraIconButton = ({
  label,
  icon,
  className,
  density = "compact",
  ...buttonProps
}: PetraIconButtonProps): React.JSX.Element => (
  <PetraButton
    {...buttonProps}
    className={["petra-icon-button", className].filter(Boolean).join(" ")}
    density={density}
    aria-label={label}
  >
    <span className="petra-icon-button__visual" aria-hidden="true">
      {icon}
    </span>
  </PetraButton>
);

export const PetraButtonGroup = ({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}): React.JSX.Element => (
  <div
    className={["petra-button-group", className].filter(Boolean).join(" ")}
    role="group"
    aria-label={label}
  >
    {children}
  </div>
);

export interface PetraLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  density?: ControlDensity;
  current?: boolean;
}

export const PetraLink = ({
  density = "comfortable",
  current = false,
  className,
  children,
  ...linkProps
}: PetraLinkProps): React.JSX.Element => (
  <a
    {...linkProps}
    className={[
      "petra-link",
      `petra-control--${density}`,
      current ? "petra-link--current" : undefined,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    aria-current={current ? "page" : linkProps["aria-current"]}
  >
    {children}
  </a>
);

interface FieldFrameProps {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  density?: ControlDensity;
}

export type PetraTextFieldProps = FieldFrameProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export const PetraTextField = ({
  id,
  label,
  hint,
  error,
  density = "comfortable",
  className,
  required,
  ...inputProps
}: PetraTextFieldProps): React.JSX.Element => {
  const generatedId = useId();
  const fieldId = id ?? `petra-field-${generatedId}`;
  const hintId = hint === undefined ? undefined : `${fieldId}-hint`;
  const errorId = error === undefined ? undefined : `${fieldId}-error`;

  return (
    <label className="petra-field" htmlFor={fieldId}>
      <span className="petra-field__label">
        {label}
        {required ? (
          <span className="petra-field__required">Required</span>
        ) : null}
      </span>
      {hint === undefined ? null : (
        <span className="petra-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      <input
        {...inputProps}
        className={[
          "petra-field__control",
          `petra-control--${density}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        id={fieldId}
        required={required}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={joinIds(
          inputProps["aria-describedby"],
          hintId,
          errorId,
        )}
      />
      {error === undefined ? null : (
        <span className="petra-field__error" id={errorId}>
          <span aria-hidden="true">!</span>
          {error}
        </span>
      )}
    </label>
  );
};

export type PetraTextAreaProps = FieldFrameProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export const PetraTextArea = ({
  id,
  label,
  hint,
  error,
  density = "comfortable",
  className,
  required,
  ...textareaProps
}: PetraTextAreaProps): React.JSX.Element => {
  const generatedId = useId();
  const fieldId = id ?? `petra-field-${generatedId}`;
  const hintId = hint === undefined ? undefined : `${fieldId}-hint`;
  const errorId = error === undefined ? undefined : `${fieldId}-error`;

  return (
    <label className="petra-field" htmlFor={fieldId}>
      <span className="petra-field__label">
        {label}
        {required ? (
          <span className="petra-field__required">Required</span>
        ) : null}
      </span>
      {hint === undefined ? null : (
        <span className="petra-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      <textarea
        {...textareaProps}
        className={[
          "petra-field__control",
          "petra-field__textarea",
          `petra-control--${density}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        id={fieldId}
        required={required}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={joinIds(
          textareaProps["aria-describedby"],
          hintId,
          errorId,
        )}
      />
      {error === undefined ? null : (
        <span className="petra-field__error" id={errorId}>
          <span aria-hidden="true">!</span>
          {error}
        </span>
      )}
    </label>
  );
};

export interface PetraTab {
  id: string;
  label: string;
  panel: ReactNode;
}

export const PetraTabs = ({
  label,
  tabs,
  selectedId,
  onSelect,
  density = "compact",
}: {
  label: string;
  tabs: PetraTab[];
  selectedId: string;
  onSelect: (id: string) => void;
  density?: ControlDensity;
}): React.JSX.Element => {
  const instanceId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedTab = tabs.find((tab) => tab.id === selectedId) ?? tabs[0];

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ): void => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (nextTab === undefined) return;
    onSelect(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  if (selectedTab === undefined) {
    return (
      <div className="petra-tabs petra-tabs--empty">No tabs available.</div>
    );
  }

  return (
    <section className="petra-tabs">
      <div className="petra-tabs__list" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedTab.id;
          return (
            <button
              className={`petra-tabs__tab petra-control--${density}`}
              id={`${instanceId}-${tab.id}-tab`}
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${instanceId}-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => moveSelection(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className="petra-tabs__panel"
        id={`${instanceId}-${selectedTab.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${instanceId}-${selectedTab.id}-tab`}
        tabIndex={0}
      >
        {selectedTab.panel}
      </div>
    </section>
  );
};

export const PetraTooltip = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): React.JSX.Element => {
  const tooltipId = useId();
  return (
    <span className="petra-tooltip">
      <button
        className="petra-tooltip__trigger"
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
      >
        <InfoIcon size={16} aria-hidden="true" />
      </button>
      <span className="petra-tooltip__content" id={tooltipId} role="tooltip">
        {children}
      </span>
    </span>
  );
};

export const PetraDialog = ({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}): React.JSX.Element => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="petra-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="petra-dialog__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <button
          className="petra-dialog__close"
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <XIcon size={16} aria-hidden="true" />
        </button>
      </header>
      {children === undefined ? null : (
        <div className="petra-dialog__body">{children}</div>
      )}
      {footer === undefined ? null : (
        <footer className="petra-dialog__footer">{footer}</footer>
      )}
    </dialog>
  );
};

export const PetraEmptyState = ({
  title,
  description,
  detail,
  actions,
  tone = "neutral",
}: {
  title: string;
  description: string;
  detail?: string;
  actions?: ReactNode;
  tone?: "neutral" | "danger";
}): React.JSX.Element => (
  <section className="petra-empty-state" data-tone={tone}>
    <span className="petra-empty-state__symbol" aria-hidden="true">
      {tone === "danger" ? <AlertIcon size={20} /> : <InfoIcon size={20} />}
    </span>
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
      {detail === undefined ? null : (
        <p className="petra-empty-state__detail">{detail}</p>
      )}
      {actions === undefined ? null : (
        <div className="petra-empty-state__actions">{actions}</div>
      )}
    </div>
  </section>
);

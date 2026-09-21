import { useCallback, useEffect, useRef, useState } from "react";

import {
  PERSONAL_PREFERENCES_STORAGE_KEY,
  PersonalPreferenceStore,
  type PersonalPreferences,
  type PersonalPreferenceReceipt,
  type PersonalPreferenceResetScope,
} from "./personal-preferences.js";

const PERSONAL_PREFERENCES_CHANGED_EVENT = "petra:personal-preferences-changed";

type PersonalPreferenceChange = Pick<
  PersonalPreferenceStore,
  "changeAppearance" | "changeLayout" | "changeEditor" | "changeAccessibility"
>;

type InitialPreferenceOverrides = {
  appearance?: Partial<PersonalPreferences["appearance"]>;
  layout?: Partial<PersonalPreferences["layout"]>;
  editor?: Partial<PersonalPreferences["editor"]>;
  accessibility?: Partial<PersonalPreferences["accessibility"]>;
};

interface PersonalPreferencesChangedDetail {
  source?: object;
  receipt?: PersonalPreferenceReceipt;
}

const browserStorage = (): Storage | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const withInitialOverrides = (
  receipt: PersonalPreferenceReceipt,
  overrides: InitialPreferenceOverrides | undefined,
): PersonalPreferenceReceipt => {
  if (overrides === undefined) return receipt;
  return {
    ...receipt,
    preferences: {
      appearance: {
        ...receipt.preferences.appearance,
        ...overrides.appearance,
      },
      layout: {
        ...receipt.preferences.layout,
        ...overrides.layout,
        panels: {
          ...receipt.preferences.layout.panels,
          ...overrides.layout?.panels,
        },
      },
      editor: { ...receipt.preferences.editor, ...overrides.editor },
      accessibility: {
        ...receipt.preferences.accessibility,
        ...overrides.accessibility,
      },
    },
  };
};

export interface PersonalPreferencesController {
  receipt: PersonalPreferenceReceipt;
  announcement: string;
  changeAppearance: (
    change: Parameters<PersonalPreferenceChange["changeAppearance"]>[0],
    announcement: string,
  ) => PersonalPreferenceReceipt;
  changeLayout: (
    change: Parameters<PersonalPreferenceChange["changeLayout"]>[0],
    announcement: string,
  ) => PersonalPreferenceReceipt;
  changeEditor: (
    change: Parameters<PersonalPreferenceChange["changeEditor"]>[0],
    announcement: string,
  ) => PersonalPreferenceReceipt;
  changeAccessibility: (
    change: Parameters<PersonalPreferenceChange["changeAccessibility"]>[0],
    announcement: string,
  ) => PersonalPreferenceReceipt;
  reset: (
    scope: PersonalPreferenceResetScope,
    announcement: string,
  ) => PersonalPreferenceReceipt;
  undoReset: () => PersonalPreferenceReceipt | undefined;
  retryPersistence: () => PersonalPreferenceReceipt;
}

export const usePersonalPreferences = (
  initialOverrides?: InitialPreferenceOverrides,
): PersonalPreferencesController => {
  const storeRef = useRef<PersonalPreferenceStore | undefined>(undefined);
  const eventSourceRef = useRef<object | undefined>(undefined);
  if (storeRef.current === undefined) {
    storeRef.current = new PersonalPreferenceStore(browserStorage());
    eventSourceRef.current = {};
  }
  const store = storeRef.current;
  const [receipt, setReceipt] = useState(() =>
    withInitialOverrides(store.snapshot(), initialOverrides),
  );
  const [announcement, setAnnouncement] = useState(
    "Personal settings are ready.",
  );

  const publish = useCallback(
    (next: PersonalPreferenceReceipt, message: string) => {
      setReceipt(next);
      setAnnouncement(message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PERSONAL_PREFERENCES_CHANGED_EVENT, {
            detail: { source: eventSourceRef.current, receipt: next },
          }),
        );
      }
      return next;
    },
    [],
  );

  useEffect(() => {
    const refresh = (message: string): void => {
      setReceipt(store.refreshFromStorage());
      setAnnouncement(message);
    };
    const onStorage = (event: StorageEvent): void => {
      if (
        event.key === PERSONAL_PREFERENCES_STORAGE_KEY ||
        event.key === null
      ) {
        refresh("Personal settings changed in another browser tab.");
      }
    };
    const onLocalChange = (event: Event): void => {
      const detail =
        event instanceof CustomEvent
          ? (event as CustomEvent<PersonalPreferencesChangedDetail>).detail
          : undefined;
      if (detail !== undefined && detail.source === eventSourceRef.current) {
        return;
      }
      if (detail?.receipt?.persistence === "session_only") {
        setReceipt(detail.receipt);
        setAnnouncement("Personal settings changed elsewhere in Petra.");
        return;
      }
      refresh("Personal settings changed elsewhere in Petra.");
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PERSONAL_PREFERENCES_CHANGED_EVENT, onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        PERSONAL_PREFERENCES_CHANGED_EVENT,
        onLocalChange,
      );
    };
  }, [store]);

  return {
    receipt,
    announcement,
    changeAppearance: (change, message) =>
      publish(store.changeAppearance(change), message),
    changeLayout: (change, message) =>
      publish(store.changeLayout(change), message),
    changeEditor: (change, message) =>
      publish(store.changeEditor(change), message),
    changeAccessibility: (change, message) =>
      publish(store.changeAccessibility(change), message),
    reset: (scope, message) => publish(store.reset(scope), message),
    undoReset: () => {
      const next = store.undoLastReset();
      return next === undefined
        ? undefined
        : publish(next, "Reset undone. Your prior personal settings are back.");
    },
    retryPersistence: () =>
      publish(
        store.retryPersistence(),
        "Petra retried saving your personal settings.",
      ),
  };
};

export const PERSONAL_PREFERENCES_STORAGE_KEY = "petra.shell.preferences.v1";

export type PersonalTheme = "system" | "stone" | "graphite" | "contrast";
export type PersonalLayoutPreset =
  "focus" | "review" | "graph" | "collaborate" | "custom";

export interface PersonalPanelLayout {
  map: number;
  details: number;
  assistant: number;
}

export interface PersonalPreferences {
  appearance: {
    theme: PersonalTheme;
  };
  layout: {
    preset: PersonalLayoutPreset;
    panels: PersonalPanelLayout;
    mapCollapsed: boolean;
    assistantCollapsed: boolean;
  };
  editor: {
    fontSize: number;
    ligatures: boolean;
  };
  accessibility: {
    reduceMotion: boolean;
  };
}

export type PersonalPreferenceGroup =
  "appearance" | "layout" | "editor" | "accessibility";

export type PersonalPreferenceResetScope =
  | { group: "all" }
  | { group: "appearance"; preference?: "theme" }
  | {
      group: "layout";
      preference?: "preset" | "panels" | "mapCollapsed" | "assistantCollapsed";
    }
  | { group: "editor"; preference?: "fontSize" | "ligatures" }
  | { group: "accessibility"; preference?: "reduceMotion" };

export type PersonalPreferencePersistence =
  "device_default" | "saved_on_device" | "session_only" | "repair_required";

export type PersonalPreferenceOperation =
  | "loaded"
  | "changed"
  | "reset"
  | "undo_reset"
  | "retry_saved"
  | "storage_refreshed";

export interface PersonalPreferenceIssue {
  group: PersonalPreferenceGroup | "all";
  preference?: string;
  reason: "invalid_stored_value" | "storage_unavailable";
}

export interface PersonalPreferenceReceipt {
  operation: PersonalPreferenceOperation;
  preferences: PersonalPreferences;
  persistence: PersonalPreferencePersistence;
  issues: PersonalPreferenceIssue[];
  changedScope?: PersonalPreferenceResetScope;
  canUndoReset: boolean;
  authority: {
    scope: "personal_device_presentation";
    projectStateChanged: false;
    workStateChanged: false;
    projectContentChanged: false;
  };
}

export interface PersonalPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PERSONAL_PANEL_LIMITS = {
  map: { min: 176, max: 320 },
  details: { min: 304, max: 520 },
  assistant: { min: 240, max: 400 },
} as const;

export const PERSONAL_LAYOUT_PRESETS: Readonly<
  Record<Exclude<PersonalLayoutPreset, "custom">, PersonalPanelLayout>
> = {
  focus: { map: 192, details: 320, assistant: 248 },
  review: { map: 216, details: 376, assistant: 272 },
  graph: { map: 184, details: 336, assistant: 248 },
  collaborate: { map: 192, details: 336, assistant: 352 },
};

export const DEFAULT_PERSONAL_PREFERENCES: Readonly<PersonalPreferences> = {
  appearance: {
    theme: "stone",
  },
  layout: {
    preset: "review",
    panels: PERSONAL_LAYOUT_PRESETS.review,
    mapCollapsed: false,
    assistantCollapsed: true,
  },
  editor: {
    fontSize: 14,
    ligatures: false,
  },
  accessibility: {
    reduceMotion: false,
  },
};

const authority = {
  scope: "personal_device_presentation",
  projectStateChanged: false,
  workStateChanged: false,
  projectContentChanged: false,
} as const;

const themes = new Set<PersonalTheme>([
  "system",
  "stone",
  "graphite",
  "contrast",
]);
const layoutPresets = new Set<PersonalLayoutPreset>([
  "focus",
  "review",
  "graph",
  "collaborate",
  "custom",
]);

const clonePreferences = (
  preferences: PersonalPreferences,
): PersonalPreferences => ({
  appearance: { ...preferences.appearance },
  layout: {
    ...preferences.layout,
    panels: { ...preferences.layout.panels },
  },
  editor: { ...preferences.editor },
  accessibility: { ...preferences.accessibility },
});

const defaultPreferences = (): PersonalPreferences =>
  clonePreferences(DEFAULT_PERSONAL_PREFERENCES);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertOnlyKeys = (
  value: object,
  allowed: ReadonlySet<string>,
  label: string,
): void => {
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new RangeError(
      `${label} contains unsupported preferences: ${unsupported.join(", ")}`,
    );
  }
};

const storedIssue = (
  group: PersonalPreferenceGroup | "all",
  preference?: string,
): PersonalPreferenceIssue => ({
  group,
  ...(preference === undefined ? {} : { preference }),
  reason: "invalid_stored_value",
});

interface DecodedPreferences {
  preferences: PersonalPreferences;
  issues: PersonalPreferenceIssue[];
}

const decodeStoredPreferences = (value: unknown): DecodedPreferences => {
  const preferences = defaultPreferences();
  const issues: PersonalPreferenceIssue[] = [];
  if (!isRecord(value)) {
    return { preferences, issues: [storedIssue("all")] };
  }

  if (
    typeof value.theme === "string" &&
    themes.has(value.theme as PersonalTheme)
  ) {
    preferences.appearance.theme = value.theme as PersonalTheme;
  } else {
    issues.push(storedIssue("appearance", "theme"));
  }

  if (
    typeof value.activePreset === "string" &&
    layoutPresets.has(value.activePreset as PersonalLayoutPreset)
  ) {
    preferences.layout.preset = value.activePreset as PersonalLayoutPreset;
  } else {
    issues.push(storedIssue("layout", "preset"));
  }

  const storedLayout = value.layout;
  if (isRecord(storedLayout)) {
    for (const panel of ["map", "details", "assistant"] as const) {
      const storedValue = storedLayout[panel];
      const limits = PERSONAL_PANEL_LIMITS[panel];
      if (
        typeof storedValue === "number" &&
        Number.isInteger(storedValue) &&
        storedValue >= limits.min &&
        storedValue <= limits.max
      ) {
        preferences.layout.panels[panel] = storedValue;
      } else {
        issues.push(storedIssue("layout", `panels.${panel}`));
      }
    }
  } else {
    issues.push(storedIssue("layout", "panels"));
  }

  for (const [storedKey, preference] of [
    ["mapCollapsed", "mapCollapsed"],
    ["assistantCollapsed", "assistantCollapsed"],
  ] as const) {
    const storedValue = value[storedKey];
    if (typeof storedValue === "boolean") {
      preferences.layout[preference] = storedValue;
    } else {
      issues.push(storedIssue("layout", preference));
    }
  }

  if (
    typeof value.editorFontSize === "number" &&
    Number.isInteger(value.editorFontSize) &&
    value.editorFontSize >= 12 &&
    value.editorFontSize <= 20
  ) {
    preferences.editor.fontSize = value.editorFontSize;
  } else {
    issues.push(storedIssue("editor", "fontSize"));
  }

  if (typeof value.editorLigatures === "boolean") {
    preferences.editor.ligatures = value.editorLigatures;
  } else {
    issues.push(storedIssue("editor", "ligatures"));
  }

  if (typeof value.reducedMotion === "boolean") {
    preferences.accessibility.reduceMotion = value.reducedMotion;
  } else {
    issues.push(storedIssue("accessibility", "reduceMotion"));
  }

  return { preferences, issues };
};

const encodePreferences = (preferences: PersonalPreferences): string =>
  JSON.stringify({
    schema_name: "petra.personal-preferences",
    schema_version: 1,
    theme: preferences.appearance.theme,
    layout: preferences.layout.panels,
    activePreset: preferences.layout.preset,
    editorFontSize: preferences.editor.fontSize,
    editorLigatures: preferences.editor.ligatures,
    reducedMotion: preferences.accessibility.reduceMotion,
    mapCollapsed: preferences.layout.mapCollapsed,
    assistantCollapsed: preferences.layout.assistantCollapsed,
  });

const loadPreferences = (
  storage: PersonalPreferenceStorage | undefined,
): {
  preferences: PersonalPreferences;
  persistence: PersonalPreferencePersistence;
  issues: PersonalPreferenceIssue[];
} => {
  if (storage === undefined) {
    return {
      preferences: defaultPreferences(),
      persistence: "session_only",
      issues: [{ group: "all", reason: "storage_unavailable" }],
    };
  }

  let stored: string | null;
  try {
    stored = storage.getItem(PERSONAL_PREFERENCES_STORAGE_KEY);
  } catch {
    return {
      preferences: defaultPreferences(),
      persistence: "session_only",
      issues: [{ group: "all", reason: "storage_unavailable" }],
    };
  }

  if (stored === null) {
    return {
      preferences: defaultPreferences(),
      persistence: "device_default",
      issues: [],
    };
  }

  try {
    const decoded = decodeStoredPreferences(JSON.parse(stored) as unknown);
    return {
      ...decoded,
      persistence:
        decoded.issues.length === 0 ? "saved_on_device" : "repair_required",
    };
  } catch {
    return {
      preferences: defaultPreferences(),
      persistence: "repair_required",
      issues: [storedIssue("all")],
    };
  }
};

const isPanelLayout = (value: unknown): value is PersonalPanelLayout =>
  isRecord(value) &&
  (
    Object.keys(PERSONAL_PANEL_LIMITS) as Array<keyof PersonalPanelLayout>
  ).every((panel) => {
    const limits = PERSONAL_PANEL_LIMITS[panel];
    return (
      typeof value[panel] === "number" &&
      Number.isInteger(value[panel]) &&
      value[panel] >= limits.min &&
      value[panel] <= limits.max
    );
  });

export class PersonalPreferenceStore {
  readonly #storage: PersonalPreferenceStorage | undefined;
  #preferences: PersonalPreferences;
  #persistence: PersonalPreferencePersistence;
  #issues: PersonalPreferenceIssue[];
  #lastReset:
    | {
        before: PersonalPreferences;
        scope: PersonalPreferenceResetScope;
      }
    | undefined;

  constructor(storage?: PersonalPreferenceStorage) {
    this.#storage = storage;
    const loaded = loadPreferences(storage);
    this.#preferences = loaded.preferences;
    this.#persistence = loaded.persistence;
    this.#issues = loaded.issues;
  }

  snapshot(): PersonalPreferenceReceipt {
    return this.#receipt("loaded");
  }

  changeAppearance(
    change: Partial<PersonalPreferences["appearance"]>,
  ): PersonalPreferenceReceipt {
    assertOnlyKeys(change, new Set(["theme"]), "Appearance change");
    if (change.theme !== undefined && !themes.has(change.theme)) {
      throw new RangeError(`Unsupported personal theme: ${change.theme}`);
    }
    this.#preferences.appearance = {
      ...this.#preferences.appearance,
      ...change,
    };
    return this.#commit("changed", { group: "appearance" });
  }

  changeLayout(change: {
    preset?: PersonalLayoutPreset;
    panels?: PersonalPanelLayout;
    mapCollapsed?: boolean;
    assistantCollapsed?: boolean;
  }): PersonalPreferenceReceipt {
    assertOnlyKeys(
      change,
      new Set(["preset", "panels", "mapCollapsed", "assistantCollapsed"]),
      "Layout change",
    );
    if (change.preset !== undefined && !layoutPresets.has(change.preset)) {
      throw new RangeError(
        `Unsupported personal layout preset: ${change.preset}`,
      );
    }
    if (change.panels !== undefined && !isPanelLayout(change.panels)) {
      throw new RangeError(
        "Personal panel sizes are outside supported limits.",
      );
    }
    if (
      (change.mapCollapsed !== undefined &&
        typeof change.mapCollapsed !== "boolean") ||
      (change.assistantCollapsed !== undefined &&
        typeof change.assistantCollapsed !== "boolean")
    ) {
      throw new TypeError("Personal layout collapse values must be boolean.");
    }
    this.#preferences.layout = {
      ...this.#preferences.layout,
      ...change,
      panels:
        change.panels === undefined
          ? this.#preferences.layout.panels
          : { ...change.panels },
    };
    return this.#commit("changed", { group: "layout" });
  }

  changeEditor(
    change: Partial<PersonalPreferences["editor"]>,
  ): PersonalPreferenceReceipt {
    assertOnlyKeys(change, new Set(["fontSize", "ligatures"]), "Editor change");
    if (
      change.fontSize !== undefined &&
      (!Number.isInteger(change.fontSize) ||
        change.fontSize < 12 ||
        change.fontSize > 20)
    ) {
      throw new RangeError("Personal editor font size must be 12–20 pixels.");
    }
    if (
      change.ligatures !== undefined &&
      typeof change.ligatures !== "boolean"
    ) {
      throw new TypeError("Personal editor ligatures value must be boolean.");
    }
    this.#preferences.editor = { ...this.#preferences.editor, ...change };
    return this.#commit("changed", { group: "editor" });
  }

  changeAccessibility(
    change: Partial<PersonalPreferences["accessibility"]>,
  ): PersonalPreferenceReceipt {
    assertOnlyKeys(change, new Set(["reduceMotion"]), "Accessibility change");
    if (
      change.reduceMotion !== undefined &&
      typeof change.reduceMotion !== "boolean"
    ) {
      throw new TypeError("Personal reduced-motion value must be boolean.");
    }
    this.#preferences.accessibility = {
      ...this.#preferences.accessibility,
      ...change,
    };
    return this.#commit("changed", { group: "accessibility" });
  }

  reset(scope: PersonalPreferenceResetScope): PersonalPreferenceReceipt {
    assertOnlyKeys(scope, new Set(["group", "preference"]), "Reset scope");
    const before = clonePreferences(this.#preferences);
    const defaults = defaultPreferences();
    switch (scope.group) {
      case "all":
        if ("preference" in scope && scope.preference !== undefined) {
          throw new RangeError("All-personal reset cannot name a preference.");
        }
        this.#preferences = defaults;
        break;
      case "appearance":
        if (scope.preference !== undefined && scope.preference !== "theme") {
          throw new RangeError("Unsupported Appearance reset scope.");
        }
        this.#preferences.appearance = { ...defaults.appearance };
        break;
      case "layout":
        if (
          scope.preference !== undefined &&
          !new Set([
            "preset",
            "panels",
            "mapCollapsed",
            "assistantCollapsed",
          ]).has(scope.preference)
        ) {
          throw new RangeError("Unsupported Layout reset scope.");
        }
        if (scope.preference === undefined) {
          this.#preferences.layout = {
            ...defaults.layout,
            panels: { ...defaults.layout.panels },
          };
        } else if (scope.preference === "panels") {
          this.#preferences.layout.panels = { ...defaults.layout.panels };
        } else if (scope.preference === "preset") {
          this.#preferences.layout.preset = defaults.layout.preset;
        } else if (scope.preference === "mapCollapsed") {
          this.#preferences.layout.mapCollapsed = defaults.layout.mapCollapsed;
        } else {
          this.#preferences.layout.assistantCollapsed =
            defaults.layout.assistantCollapsed;
        }
        break;
      case "editor":
        if (
          scope.preference !== undefined &&
          !new Set(["fontSize", "ligatures"]).has(scope.preference)
        ) {
          throw new RangeError("Unsupported Editor reset scope.");
        }
        if (scope.preference === undefined) {
          this.#preferences.editor = { ...defaults.editor };
        } else if (scope.preference === "fontSize") {
          this.#preferences.editor.fontSize = defaults.editor.fontSize;
        } else {
          this.#preferences.editor.ligatures = defaults.editor.ligatures;
        }
        break;
      case "accessibility":
        if (
          scope.preference !== undefined &&
          scope.preference !== "reduceMotion"
        ) {
          throw new RangeError("Unsupported Accessibility reset scope.");
        }
        this.#preferences.accessibility = { ...defaults.accessibility };
        break;
      default:
        throw new RangeError("Unsupported personal preference reset group.");
    }
    this.#lastReset = { before, scope };
    return this.#persistedReceipt("reset", scope);
  }

  undoLastReset(): PersonalPreferenceReceipt | undefined {
    if (this.#lastReset === undefined) return undefined;
    const { before, scope } = this.#lastReset;
    this.#preferences = clonePreferences(before);
    this.#lastReset = undefined;
    return this.#persistedReceipt("undo_reset", scope);
  }

  retryPersistence(): PersonalPreferenceReceipt {
    return this.#persistedReceipt("retry_saved");
  }

  refreshFromStorage(): PersonalPreferenceReceipt {
    const loaded = loadPreferences(this.#storage);
    this.#preferences = loaded.preferences;
    this.#persistence = loaded.persistence;
    this.#issues = loaded.issues;
    this.#lastReset = undefined;
    return this.#receipt("storage_refreshed");
  }

  #commit(
    operation: PersonalPreferenceOperation,
    scope: PersonalPreferenceResetScope,
  ): PersonalPreferenceReceipt {
    this.#lastReset = undefined;
    return this.#persistedReceipt(operation, scope);
  }

  #persistedReceipt(
    operation: PersonalPreferenceOperation,
    scope?: PersonalPreferenceResetScope,
  ): PersonalPreferenceReceipt {
    try {
      if (this.#storage === undefined) throw new Error("Storage unavailable");
      this.#storage.setItem(
        PERSONAL_PREFERENCES_STORAGE_KEY,
        encodePreferences(this.#preferences),
      );
      this.#persistence = "saved_on_device";
      this.#issues = [];
    } catch {
      this.#persistence = "session_only";
      this.#issues = [
        {
          group: scope?.group ?? "all",
          reason: "storage_unavailable",
        },
      ];
    }
    return this.#receipt(operation, scope);
  }

  #receipt(
    operation: PersonalPreferenceOperation,
    changedScope?: PersonalPreferenceResetScope,
  ): PersonalPreferenceReceipt {
    return {
      operation,
      preferences: clonePreferences(this.#preferences),
      persistence: this.#persistence,
      issues: this.#issues.map((issue) => ({ ...issue })),
      ...(changedScope === undefined ? {} : { changedScope }),
      canUndoReset: this.#lastReset !== undefined,
      authority,
    };
  }
}

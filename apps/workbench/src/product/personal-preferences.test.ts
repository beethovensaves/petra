import { describe, expect, it } from "vitest";

import {
  DEFAULT_PERSONAL_PREFERENCES,
  PERSONAL_PREFERENCES_STORAGE_KEY,
  PersonalPreferenceStore,
  type PersonalPreferenceStorage,
} from "./personal-preferences.js";

class MemoryPreferenceStorage implements PersonalPreferenceStorage {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error("blocked read");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("blocked write");
    this.values.set(key, value);
  }
}

describe("personal preference runtime owner", () => {
  it("retains supported appearance, layout, editor, and accessibility choices across reload", () => {
    const storage = new MemoryPreferenceStorage();
    const store = new PersonalPreferenceStore(storage);

    expect(store.snapshot()).toMatchObject({
      persistence: "device_default",
      preferences: DEFAULT_PERSONAL_PREFERENCES,
    });

    store.changeAppearance({ theme: "graphite" });
    store.changeLayout({
      preset: "custom",
      panels: { map: 200, details: 400, assistant: 300 },
      mapCollapsed: true,
    });
    store.changeEditor({ fontSize: 18, ligatures: true });
    const receipt = store.changeAccessibility({ reduceMotion: true });

    expect(receipt).toMatchObject({
      operation: "changed",
      persistence: "saved_on_device",
      changedScope: { group: "accessibility" },
      authority: {
        scope: "personal_device_presentation",
        projectStateChanged: false,
        workStateChanged: false,
        projectContentChanged: false,
      },
    });

    const afterReload = new PersonalPreferenceStore(storage).snapshot();
    expect(afterReload).toMatchObject({
      persistence: "saved_on_device",
      preferences: {
        appearance: { theme: "graphite" },
        layout: {
          preset: "custom",
          panels: { map: 200, details: 400, assistant: 300 },
          mapCollapsed: true,
        },
        editor: { fontSize: 18, ligatures: true },
        accessibility: { reduceMotion: true },
      },
    });
  });

  it("resets only the requested scope and supports one session undo", () => {
    const storage = new MemoryPreferenceStorage();
    const store = new PersonalPreferenceStore(storage);
    store.changeAppearance({ theme: "contrast" });
    store.changeEditor({ fontSize: 19, ligatures: true });
    store.changeAccessibility({ reduceMotion: true });

    const reset = store.reset({ group: "editor", preference: "fontSize" });
    expect(reset).toMatchObject({
      operation: "reset",
      persistence: "saved_on_device",
      changedScope: { group: "editor", preference: "fontSize" },
      canUndoReset: true,
      preferences: {
        appearance: { theme: "contrast" },
        editor: { fontSize: 14, ligatures: true },
        accessibility: { reduceMotion: true },
      },
    });

    expect(store.undoLastReset()).toMatchObject({
      operation: "undo_reset",
      persistence: "saved_on_device",
      canUndoReset: false,
      preferences: {
        appearance: { theme: "contrast" },
        editor: { fontSize: 19, ligatures: true },
        accessibility: { reduceMotion: true },
      },
    });
    expect(store.undoLastReset()).toBeUndefined();
  });

  it("supports group and all-personal reset without widening the authority scope", () => {
    const storage = new MemoryPreferenceStorage();
    const store = new PersonalPreferenceStore(storage);
    store.changeAppearance({ theme: "contrast" });
    store.changeEditor({ fontSize: 19, ligatures: true });
    store.changeAccessibility({ reduceMotion: true });

    expect(store.reset({ group: "editor" })).toMatchObject({
      changedScope: { group: "editor" },
      preferences: {
        appearance: { theme: "contrast" },
        editor: DEFAULT_PERSONAL_PREFERENCES.editor,
        accessibility: { reduceMotion: true },
      },
    });
    expect(store.reset({ group: "all" })).toMatchObject({
      changedScope: { group: "all" },
      preferences: DEFAULT_PERSONAL_PREFERENCES,
      authority: {
        scope: "personal_device_presentation",
        projectStateChanged: false,
        workStateChanged: false,
        projectContentChanged: false,
      },
    });
  });

  it("keeps a blocked write active for the session and persists it on retry", () => {
    const storage = new MemoryPreferenceStorage();
    const store = new PersonalPreferenceStore(storage);
    storage.failWrites = true;

    const sessionOnly = store.changeAppearance({ theme: "graphite" });
    expect(sessionOnly).toMatchObject({
      persistence: "session_only",
      preferences: { appearance: { theme: "graphite" } },
      issues: [{ group: "appearance", reason: "storage_unavailable" }],
    });
    expect(new PersonalPreferenceStore(storage).snapshot().preferences).toEqual(
      DEFAULT_PERSONAL_PREFERENCES,
    );

    storage.failWrites = false;
    expect(store.retryPersistence()).toMatchObject({
      operation: "retry_saved",
      persistence: "saved_on_device",
      preferences: { appearance: { theme: "graphite" } },
    });
    expect(
      new PersonalPreferenceStore(storage).snapshot().preferences.appearance
        .theme,
    ).toBe("graphite");
  });

  it("recovers only invalid stored fields while retaining other valid preferences", () => {
    const storage = new MemoryPreferenceStorage();
    storage.values.set(
      PERSONAL_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: "graphite",
        activePreset: "custom",
        layout: { map: 999, details: 400, assistant: 300 },
        editorFontSize: 18,
        editorLigatures: false,
        reducedMotion: true,
        mapCollapsed: false,
        assistantCollapsed: true,
      }),
    );

    const receipt = new PersonalPreferenceStore(storage).snapshot();
    expect(receipt.persistence).toBe("repair_required");
    expect(receipt.preferences).toMatchObject({
      appearance: { theme: "graphite" },
      layout: {
        panels: { map: 216, details: 400, assistant: 300 },
      },
      editor: { fontSize: 18, ligatures: false },
      accessibility: { reduceMotion: true },
    });
    expect(receipt.issues).toEqual([
      {
        group: "layout",
        preference: "panels.map",
        reason: "invalid_stored_value",
      },
    ]);
  });

  it("refreshes an observable newer device value without inventing a merge", () => {
    const storage = new MemoryPreferenceStorage();
    const firstTab = new PersonalPreferenceStore(storage);
    const secondTab = new PersonalPreferenceStore(storage);

    firstTab.changeAppearance({ theme: "graphite" });
    expect(secondTab.refreshFromStorage()).toMatchObject({
      operation: "storage_refreshed",
      persistence: "saved_on_device",
      preferences: { appearance: { theme: "graphite" } },
    });
  });

  it("fails closed to session defaults when device storage cannot be read", () => {
    const storage = new MemoryPreferenceStorage();
    storage.failReads = true;

    expect(new PersonalPreferenceStore(storage).snapshot()).toMatchObject({
      persistence: "session_only",
      preferences: DEFAULT_PERSONAL_PREFERENCES,
      issues: [{ group: "all", reason: "storage_unavailable" }],
    });
  });

  it("rejects values and scopes outside the personal presentation contract", () => {
    const store = new PersonalPreferenceStore(new MemoryPreferenceStorage());

    expect(() =>
      store.changeAppearance({
        theme: "stone",
        projectId: "project_not_allowed",
      } as never),
    ).toThrow(/unsupported preferences/u);
    expect(() => store.reset({ group: "project" } as never)).toThrow(
      /reset group/u,
    );
  });
});

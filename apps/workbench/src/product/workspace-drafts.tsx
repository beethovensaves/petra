import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type DraftCache = Map<string, unknown>;

const WorkspaceDraftContext = createContext<DraftCache | null>(null);

export const WorkspaceDraftProvider = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const cache = useRef<DraftCache>(new Map());
  return (
    <WorkspaceDraftContext.Provider value={cache.current}>
      {children}
    </WorkspaceDraftContext.Provider>
  );
};

export const useWorkspaceDraftState = <Value,>(
  key: string,
  initialValue: Value | (() => Value),
): readonly [Value, Dispatch<SetStateAction<Value>>, () => void] => {
  const cache = useContext(WorkspaceDraftContext);
  const [value, setValue] = useState<Value>(() => {
    if (cache?.has(key)) return cache.get(key) as Value;
    const initial =
      typeof initialValue === "function"
        ? (initialValue as () => Value)()
        : initialValue;
    cache?.set(key, initial);
    return initial;
  });
  const valueRef = useRef(value);
  const setDraft: Dispatch<SetStateAction<Value>> = useCallback(
    (next) => {
      const resolved =
        typeof next === "function"
          ? (next as (current: Value) => Value)(valueRef.current)
          : next;
      valueRef.current = resolved;
      cache?.set(key, resolved);
      setValue(resolved);
    },
    [cache, key],
  );
  const clear = useCallback(() => {
    cache?.delete(key);
  }, [cache, key]);
  return [value, setDraft, clear] as const;
};

/** Reads session-local command context when another Workspace route opens. */
export const useWorkspaceMemoryValue = <Value,>(
  key: string,
): Value | undefined =>
  useContext(WorkspaceDraftContext)?.get(key) as Value | undefined;

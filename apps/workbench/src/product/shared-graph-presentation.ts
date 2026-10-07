import { useEffect, useId } from "react";
import { canonicalize } from "json-canonicalize";
import {
  graphPresentationContent,
  graphPresentationPeer,
  type GraphPresentationParameters,
  type GraphPresentationSource,
} from "@petra/core/graph-presentation";
import { useCopilotWorkspace } from "./CopilotWorkspace.js";

const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
export const useSharedGraphPresentation = (
  source: GraphPresentationSource | undefined,
  parameters: GraphPresentationParameters | undefined,
): void => {
  const owner = useId();
  const workspace = useCopilotWorkspace();
  const share = workspace?.shareScene,
    clear = workspace?.clearScene;
  const signature =
    source === undefined || parameters === undefined
      ? undefined
      : canonicalize({ source_hash: source.content_hash, parameters });
  useEffect(() => {
    if (
      signature === undefined ||
      source === undefined ||
      parameters === undefined ||
      share === undefined
    )
      return;
    let current = true;
    share(owner, { status: "preparing" });
    void (async () => {
      const content = graphPresentationContent(source, parameters);
      const peer_content_hash = await hash(graphPresentationPeer(content));
      const content_hash = await hash({ ...content, peer_content_hash });
      if (current)
        share(owner, {
          status: "ready",
          binding: {
            parameters: structuredClone(parameters),
            content_hash,
            peer_content_hash,
          },
        });
    })().catch((error: unknown) => {
      if (current)
        share(owner, {
          status: "failed",
          reason:
            error instanceof Error
              ? error.message
              : "The displayed graph cannot be bound to this question.",
        });
    });
    return () => {
      current = false;
      clear?.(owner);
    };
    // The exact semantic hash and parameter signature own the asynchronous result.
  }, [signature, owner, share, clear]);
};

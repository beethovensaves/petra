type ClientOptions = {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
};

export class FocusedGraphClientError extends Error {
  constructor(
    readonly status: number,
    readonly response: unknown,
  ) {
    super("The exact focused graph result is unavailable or inconsistent.");
  }
}

export class FocusedGraphClient {
  constructor(readonly options: ClientOptions) {}

  async read(projectId: string, request: unknown): Promise<unknown> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(
        `/api/queries/projects/${projectId}/focused-graph`,
        this.options.baseUrl,
      ),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );
    const body: unknown = await response.json();
    if (!response.ok) throw new FocusedGraphClientError(response.status, body);
    return structuredClone(body);
  }

  readDetails(): never {
    throw new Error("The Project resume trace did not invoke Graph Details.");
  }

  readActionPreview(): never {
    throw new Error(
      "The Project resume trace did not invoke a Graph action preview.",
    );
  }
}

export class ProjectBriefClient {
  constructor(readonly options: ClientOptions) {}

  async read(projectId: string): Promise<unknown> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(`/api/queries/projects/${projectId}/brief`, this.options.baseUrl),
    );
    return response.json();
  }
}

export class ProjectBriefClientError extends Error {
  constructor(readonly status: number) {
    super("The Project Brief is unavailable.");
  }
}

export class ProjectShellClient {
  constructor(readonly options: ClientOptions) {}

  async open(projectId: string): Promise<unknown> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(`/api/queries/projects/${projectId}/shell`, this.options.baseUrl),
    );
    return response.json();
  }
}

class UnusedClient {
  constructor(...args: unknown[]) {
    void args;
  }
}

class UnusedClientError extends Error {
  constructor(...args: unknown[]) {
    super("This client is outside the Project resume browser trace.");
    void args;
  }
}

export class ProjectModelClient extends UnusedClient {}
export class ProjectDefinitionDraftClient extends UnusedClient {}
export class ProjectProfileClient extends UnusedClient {}
export class ProjectSourceDiscoveryClient extends UnusedClient {}
export class ProjectSourceRegistrationClient extends UnusedClient {}
export class ProjectSourceRegistrationClientError extends UnusedClientError {}
export class ProjectSourceRevisionClient extends UnusedClient {}
export class ProjectSourceRevisionClientError extends UnusedClientError {}
export class ProjectSourceReuseClient extends UnusedClient {}
export class ProjectSourceReuseClientError extends UnusedClientError {}
export class ProjectSourceProcessingClient extends UnusedClient {}
export class ProjectSourceProcessingClientError extends UnusedClientError {}
export class ProjectSourceLinkRemovalClient extends UnusedClient {}
export class ProjectSourceLinkRemovalClientError extends UnusedClientError {}
export class ProjectSourceLocalCopyDeletionClient extends UnusedClient {}
export class ProjectSourceLocalCopyDeletionClientError extends UnusedClientError {}
export class ProjectWorkClient extends UnusedClient {}

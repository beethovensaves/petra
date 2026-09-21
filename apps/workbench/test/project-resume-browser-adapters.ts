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

  async read(): Promise<unknown> {
    const response = await (this.options.fetch ?? fetch)(
      new URL("/unused-project-brief-client", this.options.baseUrl),
    );
    return response.json();
  }
}

class UnusedClient {
  constructor(...args: unknown[]) {
    void args;
  }
}

export class ProjectModelClient extends UnusedClient {}
export class ProjectProfileClient extends UnusedClient {}
export class ProjectWorkClient extends UnusedClient {}

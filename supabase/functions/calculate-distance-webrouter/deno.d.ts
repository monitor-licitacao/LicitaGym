/** Ambient Deno types for the Cursor/VS Code TypeScript language service. */
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }

  const env: Env;

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

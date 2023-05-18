import { Env } from ".";

interface LoggingRequestBody {
  "helicone-id": string;
  [key: string]: unknown;
}

export function isLoggingEndpoint(request: Request): boolean {
  const url = new URL(request.url);
  const method = request.method;
  const endpoint = url.pathname;
  return method === "POST" && endpoint === "/v1/log";
}

export async function handleLoggingEndpoint(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as LoggingRequestBody;
  const heliconeId = body["helicone-id"];
  const propTag = "helicone-property-";
  const heliconeHeaders = Object.fromEntries(
    [...request.headers.entries()]
      .filter(
        ([key, _]) => key.startsWith(propTag) && key.length > propTag.length
      )
      .map(([key, value]) => [key.substring(propTag.length), value])
  );

  await updateRequestProperties(heliconeId, heliconeHeaders, env);
  const propertyNames = Object.keys(heliconeHeaders).join(", ");

  return new Response(`Properties updated with properties: ${propertyNames}`, {
    status: 200,
  });
}

export async function updateRequestProperties(
  id: string,
  properties: Record<string, string>,
  env: Env
): Promise<void> {
  return;
}

export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export function sameOriginError(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {}

  const forwardedProto =
    request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  for (const host of [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ]) {
    if (host) allowed.add(`${forwardedProto}://${host}`);
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredOrigin) {
    try {
      allowed.add(new URL(configuredOrigin).origin);
    } catch {}
  }

  if (allowed.has(origin)) return null;
  return Response.json(
    { error: "Cross-origin request rejected" },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

export async function readJson<T>(request: Request, maxBytes = 16_384): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RequestError(415, "Content-Type must be application/json");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestError(413, "Request body is too large");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RequestError(413, "Request body is too large");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new RequestError(400, "Invalid JSON body");
  }
}

export function routeErrorResponse(
  error: unknown,
  fallbackMessage: string,
  context: string
): Response {
  if (error instanceof RequestError) {
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  console.error(context, error);
  return Response.json(
    { error: fallbackMessage },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}

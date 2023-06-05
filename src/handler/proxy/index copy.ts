/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import handleRequest from "./handle-request";
import { Result } from "./results";
import {
  forwardRequestToOpenAiWithRetry,
  getRetryOptions,
  RetryOptions,
} from "./retry";

import { EventEmitter } from "events";
import { extractPrompt, Prompt } from "./prompt";
import { once } from "./helpers";
import { getCacheSettings } from "./cache";
import { readAndLogResponse } from "./logResponse";

import {
  checkRateLimit,
  getRateLimitOptions,
  RateLimitOptions,
  RateLimitResponse,
  updateRateLimitCounter,
} from "./rateLimit";
import { handleLoggingEndpoint, isLoggingEndpoint } from "./properties";

// Calculate the number of tokens needed for a prompt
// This code calculates the number of tokens in a string.


function calcTokens(prompt: string): number {
  const t = prompt.split(" ").length;
  return t;
}


export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  OBSERVER: any;
  TOKENIZER_COUNT_API: string;
}

export interface RequestSettings {
  stream: boolean;
  tokenizer_count_api: string;
  helicone_api_key?: string;
  ff_stream_force_format?: boolean;
  ff_increase_timeout?: boolean;
}


export async function forwardRequestToOpenAi(
  request: Request,
  requestSettings: RequestSettings,
  body?: string,
  retryOptions?: RetryOptions
): Promise<Response> {
  const url = new URL(request.url);
  const new_url = new URL(`https://api.openai.com${url.pathname}`);
  const headers = removeHeliconeHeaders(request.headers);
  const method = request.method;
  const baseInit = { method, headers };
  const init = method === "GET" ? { ...baseInit } : { ...baseInit, body };

  let response;
  if (requestSettings.ff_increase_timeout) {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => controller.abort(), 1000 * 60 * 30);
    response = await fetch(new_url.href, { ...init, signal });
  } else {
    response = await fetch(new_url.href, init);
  }

  if (retryOptions && (response.status === 429 || response.status === 500)) {
    throw new Error(`Status code ${response.status}`);
  }

  return response;
}


async function forwardAndLog(
  requestSettings: RequestSettings,
  body: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  retryOptions?: RetryOptions,
  prompt?: Prompt
): Promise<Response> {
  const auth = request.headers.get("Authorization");
  if (auth === null) {
    return new Response("No authorization header found!", { status: 401 });
  }
  const startTime = new Date();

  const response = await (retryOptions
    ? forwardRequestToOpenAiWithRetry(
        request,
        requestSettings,
        retryOptions,
        body
      )
    : forwardRequestToOpenAi(request, requestSettings, body, retryOptions));
  const chunkEmitter = new EventEmitter();
  const responseBodySubscriber = once(chunkEmitter, "done");
  const decoder = new TextDecoder();
  let globalResponseBody = "";
  const loggingTransformStream = new TransformStream({
    transform(chunk, controller) {
      globalResponseBody += decoder.decode(chunk);
      controller.enqueue(chunk);
    },
    flush(controller) {
      chunkEmitter.emit("done", globalResponseBody);
      console.log('globalResponseBody', globalResponseBody);
    },
  });
  let readable = response.body?.pipeThrough(loggingTransformStream);

  if (requestSettings.ff_stream_force_format) {
    let buffer: any = null;
    const transformer = new TransformStream({
      transform(chunk, controller) {
        if (chunk.length < 50) {
          buffer = chunk;
        } else {
          if (buffer) {
            const mergedArray = new Uint8Array(buffer.length + chunk.length);
            mergedArray.set(buffer);
            mergedArray.set(chunk, buffer.length);
            controller.enqueue(mergedArray);
          } else {
            controller.enqueue(chunk);
          }
          buffer = null;
        }
      },
    });
    readable = readable?.pipeThrough(transformer);
  }

  const requestId =
    request.headers.get("Helicone-Request-Id") ?? crypto.randomUUID();
  async function responseBodyTimeout(delay_ms: number) {
    await new Promise((resolve) => setTimeout(resolve, delay_ms));
    console.log("response body timeout");
    return globalResponseBody;
  }
  ctx.waitUntil(
    (async () => {
  
      // THIS IS A TEMPORARY SHIM UNTIL WE BACKFILL AND MIGRATE EVERYONE TO USING HELICONE KEYS
      if (requestSettings.helicone_api_key) {
       console.log('helicone api key found');
      }
      const requestBody = body === "" ? undefined : body;
      const requestResult = await logRequest({
        request,
        auth,
        body: requestBody,
        prompt: prompt,
        ...getHeliconeHeaders(request.headers),
        requestId,
        heliconeApiKey: requestSettings.helicone_api_key,
      });

      console.log('requestResult', JSON.stringify(requestResult));

      const responseStatus = response.status;
      const [wasTimeout, responseText] = await Promise.race([
        Promise.all([true, responseBodyTimeout(15 * 60 * 1000)]), //15 minutes
        Promise.all([false, responseBodySubscriber]),
      ]);
      console.log("!!! requestResult.data", requestResult.data);

      if (requestResult.data !== null) {
        console.log('readAndLogResponse....');
        const responseResult = await readAndLogResponse({
          requestSettings,
          responseText,
          requestId: requestResult.data.request.id,
          requestBody,
          responseStatus,
          startTime,
          wasTimeout,
        });
        console.log("responseResult", JSON.stringify(responseResult));

      }
    })()
  );

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Helicone-Status", "success");
  responseHeaders.set("Helicone-Id", requestId);

  console.log('response', JSON.stringify(response));

  return new Response(readable, {
    ...response,
    headers: responseHeaders,
  });
}


type HeliconeRequest = {
  request: Request;
  auth: string;
  requestId: string;
  body?: string;
  prompt?: Prompt;
  heliconeApiKey?: string;
} & HeliconeHeaders;

interface HeliconeHeaders {
  userId: string | null;
  promptId: string | null;
  properties?: Record<string, string>;
  isPromptRegexOn: boolean;
  promptName: string | null;
}

async function getPromptId(
  prompt: Prompt,
  name: string | null,
  auth: string
): Promise<Result<string, string>> {
  return { data: null, error: '' };

}


async function logRequest({
  request,
  userId,
  promptId,
  requestId,
  auth,
  body,
  properties,
  prompt,
  promptName,
  heliconeApiKey,
}: HeliconeRequest): Promise<
  Result<
    {
      request: any;
      properties: any;
    },
    string
  >
> {
  try {
    const json = body ? JSON.parse(body) : {};
    const jsonUserId = json.user;

    const formattedPromptResult = undefined; 
   
    const formattedPromptId = null;
    const prompt_values = prompt !== undefined ? prompt.values : null;
    const hashed_auth = await hash(auth);

    

    // TODO - once we deprecate using OpenAI API keys, we can remove this
    // if (userIdError !== null) {
    //   return { data: null, error: userIdError };
    // }

      return {
        data: { request: json, properties: null },
        error: null,
      };
    
  } catch (e) {
    return { data: null, error: JSON.stringify(e) };
  }
}


async function hash(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashedKey = await crypto.subtle.digest(
    { name: "SHA-256" },
    encoder.encode(key)
  );
  const byteArray = Array.from(new Uint8Array(hashedKey));
  const hexCodes = byteArray.map((value) => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, "0");
    return paddedHexCode;
  });
  return hexCodes.join("");
}

function getHeliconeHeaders(headers: Headers): HeliconeHeaders {
  const propTag = "helicone-property-";
  const properties = Object.fromEntries(
    [...headers.entries()]
      .filter(([key]) => key.startsWith(propTag) && key.length > propTag.length)
      .map(([key, value]) => [key.substring(propTag.length), value])
  );
  return {
    userId:
      headers.get("Helicone-User-Id")?.substring(0, 128) ??
      headers.get("User-Id")?.substring(0, 128) ??
      null,
    promptId: headers.get("Helicone-Prompt-Id")?.substring(0, 128) ?? null,
    properties: Object.keys(properties).length === 0 ? undefined : properties,
    isPromptRegexOn: headers.get("Helicone-Prompt-Format") !== null,
    promptName: headers.get("Helicone-Prompt-Name")?.substring(0, 128) ?? null,
  };
}

function removeHeliconeHeaders(request: Headers): Headers {
  const newHeaders = new Headers();
  for (const [key, value] of request.entries()) {
    if (!key.toLowerCase().startsWith("helicone-")) {
      newHeaders.set(key, value);
    }
  }
  return newHeaders;
}


async function uncachedRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  requestSettings: RequestSettings,
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await extractPrompt(request);
  if (result.data !== null) {
    const { request: formattedRequest, body: body } = result.data;
    return await forwardAndLog(
      requestSettings,
      body,
      formattedRequest,
      env,
      ctx,
      retryOptions,
    );
  } else {
    return new Response(result.error, { status: 400 });
  }
}

async function buildCachedRequest(
  request: Request,
  idx: number
): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase().startsWith("helicone-")) {
      headers.set(key, value);
    }
    if (key.toLowerCase() === "authorization") {
      headers.set(key, value);
    }
  }

  const cacheKey = await hash(
    request.url +
      (await request.text()) +
      JSON.stringify([...headers.entries()]) +
      (idx >= 1 ? idx.toString() : "")
  );
  const cacheUrl = new URL(request.url);

  const pathName = cacheUrl.pathname.replaceAll("/", "_");
  cacheUrl.pathname = `/posts/${pathName}/${cacheKey}`;

  return new Request(cacheUrl, {
    method: "GET",
    headers: headers,
  });
}
async function saveToCache(
  request: Request,
  response: Response,
  cacheControl: string,
  settings: { maxSize: number }
): Promise<void> {
  console.log("Saving to cache");
  const cache = caches.default;
  const responseClone = response.clone();
  const responseHeaders = new Headers(responseClone.headers);
  responseHeaders.set("Cache-Control", cacheControl);
  const cacheResponse = new Response(responseClone.body, {
    ...responseClone,
    headers: responseHeaders,
  });
  console.log("cache response", response.headers);
  const { freeIndexes } = await getMaxCachedResponses(
    request.clone(),
    settings
  );
  if (freeIndexes.length > 0) {
    cache.put(await buildCachedRequest(request, freeIndexes[0]), cacheResponse);
  } else {
    throw new Error("No free indexes");
  }
}

async function getMaxCachedResponses(
  request: Request,
  { maxSize }: { maxSize: number }
): Promise<{ requests: Response[]; freeIndexes: number[] }> {
  const cache = caches.default;
  const requests = await Promise.all(
    Array.from(Array(maxSize).keys()).map(async (idx) => {
      const requestCache = await buildCachedRequest(request.clone(), idx);
      return cache.match(requestCache);
    })
  );
  return {
    requests: requests.filter((r) => r !== undefined) as Response[],
    freeIndexes: requests
      .map((r, idx) => idx)
      .filter((idx) => requests[idx] === undefined),
  };
}

async function getCachedResponse(
  request: Request,
  settings: { maxSize: number }
): Promise<Response | null> {
  const { requests: requestCaches, freeIndexes } = await getMaxCachedResponses(
    request.clone(),
    settings
  );
  if (freeIndexes.length > 0) {
    console.log("Max cache size reached, not caching");
    return null;
  } else {
    const cacheIdx = Math.floor(Math.random() * requestCaches.length);
    const randomCache = requestCaches[cacheIdx];
    const cachedResponseHeaders = new Headers(randomCache.headers);
    cachedResponseHeaders.append("Helicone-Cache", "HIT");
    cachedResponseHeaders.append(
      "Helicone-Cache-Bucket-Idx",
      cacheIdx.toString()
    );
    return new Response(randomCache.body, {
      ...randomCache,
      headers: cachedResponseHeaders,
    });
  }
}

async function recordCacheHit(headers: Headers, env: Env): Promise<void> {
  const requestId = headers.get("helicone-id");
  if (!requestId) {
    console.error("No request id found in cache hit");
    return;
  }
  return;
}

function generateRateLimitHeaders(
  rateLimitCheckResult: RateLimitResponse,
  rateLimitOptions: RateLimitOptions
): { [key: string]: string } {
  const policy = `${rateLimitOptions.quota};w=${rateLimitOptions.time_window};u=${rateLimitOptions.unit}`;
  const headers: { [key: string]: string } = {
    "Helicone-RateLimit-Limit": rateLimitCheckResult.limit.toString(),
    "Helicone-RateLimit-Remaining": rateLimitCheckResult.remaining.toString(),
    "Helicone-RateLimit-Policy": policy,
  };

  if (rateLimitCheckResult.reset !== undefined) {
    headers["Helicone-RateLimit-Reset"] = rateLimitCheckResult.reset.toString();
  }

  return headers;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      if (request.url.includes("audio")) {
        const url = new URL(request.url);
        const new_url = new URL(`https://api.openai.com${url.pathname}`);
        console.log("new url", new_url.href);
        return await fetch(new_url.href, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
      }
      if (isLoggingEndpoint(request)) {
        const response = await handleLoggingEndpoint(request, env);
        return response;
      }

      const rateLimitOptions = getRateLimitOptions(request);

      const requestBody =
        request.method === "POST"
          ? await request.clone().json<{ stream?: boolean; user?: string }>()
          : {};

      let additionalHeaders: { [key: string]: string } = {};
      if (rateLimitOptions !== undefined) {
        const auth = request.headers.get("Authorization");

        if (auth === null) {
          return new Response("No authorization header found!", {
            status: 401,
          });
        }

        const hashedKey = await hash(auth);
        const rateLimitCheckResult = await checkRateLimit(
          request,
          env,
          rateLimitOptions,
          hashedKey,
          requestBody.user
        );

        additionalHeaders = generateRateLimitHeaders(
          rateLimitCheckResult,
          rateLimitOptions
        );

        if (rateLimitCheckResult.status === "rate_limited") {
          return new Response(
            JSON.stringify({
              message:
                "Rate limit reached. Please wait before making more requests.",
            }),
            {
              status: 429,
              headers: {
                "content-type": "application/json;charset=UTF-8",
                ...additionalHeaders,
              },
            }
          );
        }
      }

      const requestSettings: RequestSettings = {
        stream: requestBody.stream ?? false,
        tokenizer_count_api: env.TOKENIZER_COUNT_API,
        helicone_api_key: request.headers.get("helicone-auth") ?? undefined,
        ff_stream_force_format:
          request.headers.get("helicone-ff-stream-force-format") === "true",
        ff_increase_timeout:
          request.headers.get("helicone-ff-increase-timeout") === "true",
      };

      const retryOptions = getRetryOptions(request);

      const { data: cacheSettings, error: cacheError } = getCacheSettings(
        request.headers,
        requestBody.stream ?? false
      );

      if (cacheError !== null) {
        return new Response(cacheError, { status: 400 });
      }

      if (cacheSettings.shouldReadFromCache) {
        const cachedResponse = await getCachedResponse(
          request.clone(),
          cacheSettings.bucketSettings
        );
        if (cachedResponse) {
          ctx.waitUntil(recordCacheHit(cachedResponse.headers, env));
          return cachedResponse;
        }
      }

      const requestClone = cacheSettings.shouldSaveToCache
        ? request.clone()
        : null;

      const response = await uncachedRequest(
        request,
        env,
        ctx,
        requestSettings,
        retryOptions
      );

      if (cacheSettings.shouldSaveToCache && requestClone) {
        ctx.waitUntil(
          saveToCache(
            requestClone,
            response,
            cacheSettings.cacheControl,
            cacheSettings.bucketSettings
          )
        );
      }
      const responseHeaders = new Headers(response.headers);
      if (cacheSettings.shouldReadFromCache) {
        responseHeaders.append("Helicone-Cache", "MISS");
      }
      Object.entries(additionalHeaders).forEach(([key, value]) => {
        responseHeaders.append(key, value);
      });

      if (rateLimitOptions !== undefined) {
        const auth = request.headers.get("Authorization");

        if (auth === null) {
          return new Response("No authorization header found!", {
            status: 401,
          });
        }
        const hashedKey = await hash(auth);
        updateRateLimitCounter(
          request,
          env,
          rateLimitOptions,
          hashedKey,
          requestBody.user
        );
      }

      return new Response(response.body, {
        ...response,
        status: response.status,
        headers: responseHeaders,
      });
    } catch (e) {
      console.error(e);
      return new Response(
        JSON.stringify({
          "helicone-message":
            "Helicone ran into an error servicing your request: " + e,
          support:
            "Please reach out on our discord or email us at help@helicone.ai, we'd love to help!",
          "helicone-error": JSON.stringify(e),
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "helicone-error": "true",
          },
        }
      );
    }
  },
};
import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

describe("Worker", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  describe("handleRequest", () => {
    it("should return a response with status 404 if OAI-ProxyURL is not found", async () => {
      await OAI_KV.put("OAI-ProxyKey", "fake-key");

      const resp = await worker.fetch("/", {
        method: "POST",
        body: "some-body",
      });
      expect(resp.status).toBe(404);
      const text = await resp.text();
      expect(text).toBe("Proxy URL not found");
    });

    it("should return a response with status 404 if OAI-ProxyKey is not found", async () => {
      await OAI_KV.put("OAI-ProxyURL", "https://fake-proxy-url.com");

      const resp = await worker.fetch("/", {
        method: "POST",
        body: "some-body",
      });
      expect(resp.status).toBe(404);
      const text = await resp.text();
      expect(text).toBe("OpenAI Token not found");
    });

    it("should proxy the request to the given URL with the correct method, headers, and body", async () => {
      await OAI_KV.put("OAI-ProxyURL", "https://fake-proxy-url.com");
      await OAI_KV.put("OAI-ProxyKey", "fake-key");

      const proxiedUrl = "https://fake-proxied-url.com";
      const proxiedMethod = "POST";
      const proxiedHeaders = {
        Authorization: "fake-key",
        "Content-Type": "application/json",
      };
      const proxiedBody = "some-body";

      const proxiedRequest = new Request(proxiedUrl, {
        method: proxiedMethod,
        headers: proxiedHeaders,
        body: proxiedBody,
      });

      const fetchSpy = jest.spyOn(global, "fetch");
      fetchSpy.mockResolvedValueOnce(new Response("proxied-response"));

      const resp = await worker.fetch("/", {
        method: proxiedMethod,
        body: proxiedBody,
      });
      expect(resp.status).toBe(200);
      const text = await resp.text();
      expect(text).toBe("proxied-response");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const fetchCall = fetchSpy.mock.calls[0];
      expect(fetchCall[0].url).toBe(proxiedUrl);
      expect(fetchCall[0].method).toBe(proxiedMethod);
      expect(fetchCall[0].headers.get("Authorization")).toBe(
        proxiedHeaders.Authorization
      );
      expect(fetchCall[0].headers.get("Content-Type")).toBe(
        proxiedHeaders["Content-Type"]
      );
      expect(await fetchCall[0].text()).toBe(proxiedBody);
    });
  });
});

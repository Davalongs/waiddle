/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	apiKey: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

const superSecret = "PetricorTruman"

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		return encryptAPIKey(request, env, ctx);
	},
};

async function encryptAPIKey(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	let reqBody:any
	try {
		reqBody = await request.json();
	} catch (e) {
		return new Response("Bad json in body payload", { status: 400 })
	}

	if (!reqBody.token) return new Response("Token not found in payload", { status: 400 })

	let encryptedToken
	try {
		encryptedToken = await encryptToken(reqBody.token)
	} catch (e) {
		return new Response(`Unable to encrypt token due to: ${e}`, { status: 500 })
	}
	
	return new Response(JSON.stringify(encryptedToken));
}

async function encryptToken(token: string): Promise<string> {
	const text = new TextEncoder().encode(token);

	const key = await getCryptoKey();

	const digest = await crypto.subtle.encrypt("SHA-256", key, text);

	return new TextDecoder("utf-8").decode(digest);

}

async function getCryptoKey(): Promise<CryptoKey> {

	const encoder = new TextEncoder();
    const secretKeyData = encoder.encode(superSecret);
	return crypto.subtle.importKey(
		"raw",
		secretKeyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"]
	  );
}

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

// TODO: Initialize a random iv for each encryption operation and store it to reuse it in the decrypt operation.
const fixedIV: Uint8Array = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

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

	let encryptedToken: string
	try {
		encryptedToken = await encryptToken(reqBody.token)
	} catch (e) {
		return new Response(`Unable to encrypt token due to: ${e}`, { status: 500 })
	}
	
	return new Response(JSON.stringify({key: encryptedToken}));
}

async function encryptToken(token: string): Promise<string> {
	const text = new TextEncoder().encode(token);

	const key = await getCryptoKey();
	const iv = fixedIV

	const encryptedData = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		text
	);

	const encryptedArrayBuffer = new Uint8Array(encryptedData);
	const combinedIvAndData = new Uint8Array(iv.length + encryptedArrayBuffer.length);
	combinedIvAndData.set(iv);
	combinedIvAndData.set(encryptedArrayBuffer, iv.length);

	return btoa(String.fromCharCode(...combinedIvAndData));
	// We can't use the Buffer class inside a cloudflare worker, so we need to
	// use the deprecated legacy btoa function. When possible, do this:
	// return Buffer.from(combinedIvAndData).toString('base64');
}

async function getCryptoKey(): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const secretKeyData = encoder.encode(superSecret);

	// Hash the secretKeyData using SHA-256
	const hashedSecret = await crypto.subtle.digest("SHA-256", secretKeyData);

	// Import the hashed key for AES-GCM
	return crypto.subtle.importKey(
		"raw",
		hashedSecret,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"]
	);
}

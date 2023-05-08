export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// OIA_PROXY: KVNamespace;

	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;

	// THIS --> Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;

	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event.request));
});

export async function handleRequest(request: Request) {
	// The URL of the API to proxy
	const targetUrl = 'https://api.openai.com';

	// Parse the request URL and extract the domain and endpoint
	const requestUrl = new URL(request.url);
	const requestEndpoint = requestUrl.pathname;

	// Extract the OpenAI token from the Authorization header
	const openaiToken = request.headers.get('Authorization');

	// Check if a target URL and OpenAI token were found
	if (!targetUrl) return new Response("Proxy URL not found", { status: 404 });
	if (!openaiToken) return new Response("OpenAI Token not found", { status: 404 });

	// Store original request data for future analytics
	const originalRequestData = {
		method: request.method,
		url: request.url,
		headers: Object.fromEntries(request.headers.entries())
	};

	// Create a new proxied request with the OpenAI token and JSON body
	const proxiedUrl = targetUrl + requestEndpoint;
	const proxiedMethod = request.method;
	const proxiedHeaders = {
		Authorization: openaiToken,
		"Content-Type": "application/json"
	};
	const proxiedBody = JSON.parse(await request.text());

	const proxiedRequest = new Request(proxiedUrl, {
		method: proxiedMethod,
		headers: proxiedHeaders,
		body: JSON.stringify(proxiedBody)
	});

	// Store proxied request data for future analytics
	const proxiedRequestData = {
		method: proxiedMethod,
		url: proxiedUrl,
		headers: proxiedHeaders,
		body: proxiedBody
	};

	// Fetch the response from the proxied request
	const proxiedResponse = await fetch(proxiedRequest);

	// Store proxied response data for future analytics
	const proxiedResponseData = {
		status: proxiedResponse.status,
		statusText: proxiedResponse.statusText,
		headers: Object.fromEntries(proxiedResponse.headers.entries()),
		body: await proxiedResponse.text()
	};

	// Create a new response with the proxied response data
	const response = new Response(proxiedResponseData.body, {
		status: proxiedResponseData.status,
		statusText: proxiedResponseData.statusText,
		headers: proxiedResponseData.headers
	});

	return response;
}
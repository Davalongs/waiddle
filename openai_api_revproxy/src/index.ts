export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	OIA_PROXY: KVNamespace;

	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
})

async function handleRequest(request: Request) {
	const proxyUrlKey = new URL(request.url).searchParams.get('key')

	if (!proxyUrlKey) {
		return new Response('Missing "key" parameter', { status: 400 })
	}

	const proxyUrl = await OIA_PROXY.get(proxyUrlKey)

	if (!proxyUrl) {
		return new Response('Proxy URL not found', { status: 404 })
	}

	const proxiedRequest = new Request(proxyUrl, {
		method: request.method,
		headers: request.headers,
		body: request.body,
	})

	return fetch(proxiedRequest)
}
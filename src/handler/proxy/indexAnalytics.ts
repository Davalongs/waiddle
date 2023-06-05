import useReflare from 'reflare';

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// These initial Types are based on bindings that don't exist in the project yet,
// you can follow the links to learn how to implement them.

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket
	//MY_BUCKET: R2Bucket
	OBSERVER: any
}

const handleRequest = async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
  const reflare = await useReflare();
  //console.log(new Map(request.headers));
  const headersExtract:any= {};
  const keys = new Map(request.headers).keys();
  let key;
  while ((key = keys.next().value)) {
    headersExtract[key] = request.headers.get(key);
  }

  //console.log("onRequest", request.url, JSON.stringify(headersExtract));

  env.OBSERVER.writeDataPoint({
	'blobs': [ 
	  request.cf?.colo, 
	  request.cf?.country, 
	  request.cf?.city, 
	  request.cf?.region, 
	  request.cf?.timezone
	],
	'doubles': [
	  request.cf?.metroCode, 
	  request.cf?.longitude, 
	  request.cf?.latitude
	],
	'indexes': [
	  request.cf?.postalCode
	] 
  });

  reflare.push({
    path: "/*",
    upstream: {
      domain: "api.openai.com",
      protocol: "https",
	  timeout: 60000,
	  onRequest: (request: Request, url: string): Request => {
		return request;
	  },
	  onResponse: (response: Response, url: string): Response => {
		
		// If the URL ends with `.html` or `/`, sets the `cache-control` header
		//if (url.endsWith('.html') || url.endsWith('/')) {
		//  response.headers.set('cache-control', 'public, max-age=240, s-maxage=60');
		//}
		//response.headers.set('x-proxy', 'observer v.1.0.0');
		//const responseJson = response.clone().json();
		//console.log('onResponse', JSON.stringify(responseJson));
		return response;
	  }
    }
  });

  return reflare.handle(request);
};

/*addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));	
});*/

export default {
	async fetch(
	  request: Request,
	  env: Env,
	  ctx: ExecutionContext
	): Promise<Response> {
	  return handleRequest(request, env, ctx);
	},
  };

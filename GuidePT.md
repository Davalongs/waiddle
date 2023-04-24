# Proxy with Cloudflare Workers + KV database

Here are the steps to set up a proxy using Cloudflare Workers and storing proxy URLs in a Cloudflare KV database:

1. Set up a Cloudflare account and create a new Workers project.

    * Sign up for a Cloudflare account if you don't have one: https://dash.cloudflare.com/sign-up
    * Log in to your account and navigate to the "Workers" section.
    * Click on "Create a Worker" and create a new Workers project.
    
2. Add the KV namespace to your project.

    * In the Cloudflare dashboard, go to the "Workers" section and click on "KV" in the left sidebar.
    * Click on "Create a namespace" and give it a name, e.g., "PROXY_URLS".
    * In the Workers project settings, bind the created namespace to a variable by adding a new KV Namespace binding. Set the variable name, e.g., "proxyUrls", and choose the namespace you just created.

3. Proxy worker code:


``` javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const proxyUrlKey = new URL(request.url).searchParams.get('key')

  if (!proxyUrlKey) {
    return new Response('Missing "key" parameter', { status: 400 })
  }

  const proxyUrl = await PROXY_URLS.get(proxyUrlKey)

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
```

> *This code listens for incoming requests, reads the 'key' query parameter, fetches the corresponding proxy URL from the KV database, and then forwards the request to the fetched proxy URL.*

4. Deploy the worker.

    * Save your changes in the Cloudflare Workers editor.
    * Click on "Deploy" to deploy your worker to your desired domain.
5. Add proxy URLs to the KV database.

    * Go to the "Workers" section in the Cloudflare dashboard and click on "KV" in the left sidebar.
    * Choose your namespace and click on "Add key-value pair".
    * Enter a key and the corresponding proxy URL as the value, then click on "Save".

Once these steps are complete, your proxy should be up and running. To use the proxy, send a request to your deployed worker URL with the 'key' query parameter set to the key of the desired proxy URL.

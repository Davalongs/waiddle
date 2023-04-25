# Proxy with Cloudflare Workers + KV database <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->
- [Local Dev environment (Using Wrangler)](#local-dev-environment-using-wrangler)
  - [Install Wrangler](#install-wrangler)
  - [Create a new Cloudflare worker project](#create-a-new-cloudflare-worker-project)
  - [Write the proxy code](#write-the-proxy-code)
  - [Configure the worker](#configure-the-worker)
  - [Deploy the worker](#deploy-the-worker)
  - [Testing the proxy](#testing-the-proxy)
- [Cloud Dev environment (without Wrangler)](#cloud-dev-environment-without-wrangler)
  - [Set up a Cloudflare account and create a new Workers project](#set-up-a-cloudflare-account-and-create-a-new-workers-project)
  - [Add the KV namespace to your project](#add-the-kv-namespace-to-your-project)
  - [Proxy worker code](#proxy-worker-code)
  - [Deploy the worker](#deploy-the-worker-1)
  - [Add proxy URLs to the KV database](#add-proxy-urls-to-the-kv-database)

<br />

## Local Dev environment (Using Wrangler)

To create and use a proxy using a Cloudflare worker with Wrangler, you can follow these steps:


### Install Wrangler

In order to use the latest features you must make sure that wrangler is up to date. For this you should uninstall the global version of the @cloudflare/wrangler package using the npm uninstall command, and then install the latest version of the wrangler package globally using the npm install command. Here is the command:

``` bash
npm uninstall -g @cloudflare/wrangler && npm install -g wrangler
```

### Create a new Cloudflare worker project

To create a new worker project, you can use the following command in your terminal:

   ``` bash
   wrangler generate <project_name>
   ```

   This will create a new worker project with a basic setup that you can use as a starting point.


### Write the proxy code

To create a proxy, you will need to write some code that will forward incoming requests to another server. Here is some example code that you can use:

   ``` javascript
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })

   async function handleRequest(request) {
     const url = new URL(request.url)
     url.hostname = '<destination_url>'
     const newRequest = new Request(url.toString(), {
       method: request.method,
       headers: request.headers,
       body: request.body
     })
     return fetch(newRequest)
   }
   ```

   This code will intercept incoming requests and forward them to the `destination_url` that you specify.


### Configure the worker

To configure the worker, you will need to create a `wrangler.toml` file in the root of your project. Here is an example configuration that you can use:

   ``` toml
   name = "<project_name>"
   type = "javascript"
   account_id = "<account_id>"
   workers_dev = true
   route = "/*"
   ```

   You will need to replace `<project_name>` with the name of your project, and `<account_id>` with your Cloudflare account ID.


### Deploy the worker

To deploy the worker, you can use the following command:

   ``` bash
   wrangler publish
   ```

   This will upload your code to Cloudflare and make it available at the URL specified in your `route` configuration.


### Testing the proxy

To test the proxy, you can send requests to the URL of your worker. For example, if your worker is deployed at `https://example.com`, you can send requests to `https://example.com/path/to/destination`.

<br />
<br />

## Cloud Dev environment (without Wrangler)
Here are the steps to set up a proxy using Cloudflare Workers and storing proxy URLs in a Cloudflare KV database:

### Set up a Cloudflare account and create a new Workers project

  * Sign up for a Cloudflare account if you don't have one: https://dash.cloudflare.com/sign-up
  * Log in to your account and navigate to the "Workers" section.
  * Click on "Create a Worker" and create a new Workers project.
    
### Add the KV namespace to your project

  * In the Cloudflare dashboard, go to the "Workers" section and click on "KV" in the left sidebar.
  * Click on "Create a namespace" and give it a name, e.g., "PROXY_URLS".
  * In the Workers project settings, bind the created namespace to a variable by adding a new KV Namespace binding. Set the variable name, e.g., "proxyUrls", and choose the namespace you just created.

### Proxy worker code


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

### Deploy the worker

  Save your changes in the Cloudflare Workers editor, then click on "Deploy" to deploy your worker to your desired domain.

### Add proxy URLs to the KV database

  Go to the "Workers" section in the Cloudflare dashboard and click on "KV" in the left sidebar then choose your namespace and click on "Add key-value pair" and enter a key and the corresponding proxy URL as the value, then click on "Save".

  To use the proxy, send a request to your deployed worker URL with the 'key' query parameter set to the key of the desired proxy URL.
addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
  });

  async function handleRequest(request) {
    const proxyUrl = await OAI_KV.get("OAI-ProxyURL");
    const openAIToken = await OAI_KV.get("OAI-ProxyKey");
    if (!proxyUrl) return new Response("Proxy URL not found", { status: 404 });
    if (!openAIToken) return new Response("OpenAI Token not found", { status: 404 });
        
    const proxiedMethod = request.method;
    const proxiedHeaders = {Authorization: openAIToken, "Content-Type": "application/json"};
    const proxiedBody = await request.text();

    console.log(proxiedHeaders)

    const proxiedRequest = new Request(proxyUrl, {
      method: proxiedMethod,
      headers: proxiedHeaders,
      body: proxiedBody
    });
    
    return fetch(proxiedRequest);
  }

import { Context, Hono } from 'hono'
import useReflare from "reflare";
import { Plugin, PluginFactory } from "../../plugins";
import { s } from 'vitest/dist/types-b7007192';

const Proxy = new Hono()

Proxy.all("/", proxy)

async function proxy(c:Context) {
  const reflare = await useReflare();

  const plugin = PluginFactory.getPlugin(c)

  reflare.push({
    path: '/*',
    upstream: {
      domain: plugin.forwardHost(),
      protocol: 'https',
      onRequest: plugin.preRequest(c),
      onResponse: plugin.postResponse(c),
    },
  })

  let forwardedResponse = await reflare.handle(c.req.raw)
  const forwardedResponse2log = forwardedResponse.clone()
  let { readable, writable } = new TransformStream();

  // Start pumping the body. NOTE: No await!
  forwardedResponse.body?.pipeTo(writable).catch(e => {
    console.log(`Error piping forwarded response: ${e}`)
  });

  
  logChunks(forwardedResponse2log, plugin)

  // ... and deliver our Response while that’s running.
  return new Response(readable, forwardedResponse);

}

async function logChunks(response: Response, plugin: Plugin): Promise<void> {
  if (!response.body) {
    return
  }
  try {
    let bytes = 0
    let iteration = 0
    let streamProcessor = plugin.newStreamProcessor()
    for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
      bytes += chunk.length;
      iteration++
      if (iteration == 1) {
        console.log(`Tha Chunk\n${String.fromCharCode(...chunk)}`);
      }
      streamProcessor.handleChunk(chunk)
      console.log(`Read ${bytes} characters in ${iteration} iterations.`);
    }
    console.log()
  } catch (e) {
    if (e instanceof TypeError) {
      console.log(e);
      console.log("TypeError: Browser may not support async iteration");
    } else {
      console.log(`Error in async iterator: ${e}.`);
    }
  }
}

export default Proxy

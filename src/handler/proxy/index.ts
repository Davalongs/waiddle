import { Context, Hono } from 'hono'
import useReflare from "reflare";
import { PluginFactory } from "../../plugins";

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
  forwardedResponse.body?.pipeTo(writable);

  // let [toResponse, toLog] = readable.tee()

    // ... and deliver our Response while that’s running.
  const response = new Response(readable, forwardedResponse);
  logChunks(forwardedResponse2log)

  return response
}

async function logChunks(response: Response): Promise<void> {
  if (!response.body) {
    return
  }
  try {
    let bytes = 0
    for await (const chunk of response.body) {
      bytes += chunk.length;
      console.log(`Chunk: ${String.fromCharCode(...chunk)}. Read ${bytes} characters.`);
    }
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

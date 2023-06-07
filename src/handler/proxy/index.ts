import {  } from "events";
import { Context, Hono } from 'hono'
import useReflare from "reflare";

const Proxy = new Hono()

Proxy.all("/", proxy)

async function proxy(c:Context) {
  const reflare = await useReflare();

  reflare.push({
    path: '/*',
    upstream: {
      domain: 'api.openai.com',
      protocol: 'https',
    },
  })

  return reflare.handle(c.req.raw)
}

export default Proxy
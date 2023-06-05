import { Context, Hono } from 'hono'

const Ping = new Hono()

Ping.get(
    '/', 
    pong
)

async function pong(c:Context): Promise<Response> {
    // TODO: It complains about call response.clone() without read the body of both clones.
    // This is causes by zod validation, but we follow the official docs: 
    // https://hono.dev/guides/validation#zod-validator-middleware
    // We need to solve this issue.
	
	return new Response(JSON.stringify({service: "observer", message: "pong"}));
}

export default Ping
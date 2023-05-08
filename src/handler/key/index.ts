import { Context, Hono } from 'hono'
import { EncryptToken } from './crypto'
import { NewKeyValidator } from './validation'

const Key = new Hono()

Key.post(
    '/', 
    NewKeyValidator,
    newKey
)

async function newKey(c:Context): Promise<Response> {
    // TODO: It complains about call response.clone() without read the body of both clones.
    // This is causes by zod validation, but we follow the official docs: 
    // https://hono.dev/guides/validation#zod-validator-middleware
    // We need to solve this issue.
    const { token } = c.req.valid('json')
    let encryptedToken: string
    try {
		encryptedToken = await EncryptToken(token)
	} catch (e) {
		return new Response(`Unable to encrypt token due to: ${e}`, { status: 500 })
	}
	
	return new Response(JSON.stringify({key: encryptedToken}));
}

export default Key
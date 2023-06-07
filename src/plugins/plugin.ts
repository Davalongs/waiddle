import { Context } from "hono"

interface Plugin {
    getName(): string
    getDescription(): string
    getForwardHost(): string
    getForwardProtocol(): string
    preRequest(c: Context): void // Pass only the raw Request?
    postResponse(c: Context, respose: Response): void // Pass only raw Request? Not to pass the context at all?
}
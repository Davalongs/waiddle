import { Context } from "hono"

export interface Plugin {
    name(): string
    description(): string
    forwardHost(): string
    forwardProtocol(): string
    preRequest(c: Context): void // Pass only the raw Request?
    postResponse(c: Context, respose: Response): Promise<void> // Pass only raw Request? Not to pass the context at all?
}
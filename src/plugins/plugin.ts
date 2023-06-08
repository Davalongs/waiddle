import { Context } from "hono"
import { GeneralPlugin } from "./general/general"

export interface Plugin {
    name(): string
    description(): string
    forwardHost(): string
    forwardProtocol(): string
    preRequest(c: Context): RequestCallback // Pass only the raw Request?
    postResponse(c: Context): ResponseCallback // Pass only raw Request? Not to pass the context at all?
}

export class PluginFactory {
    public static getPlugin(c: Context): Plugin {
        return new GeneralPlugin(c)
    }
}

export type RequestCallback = (request: Request, url: string) => Request;
export type ResponseCallback = (response: Response, url: string) => Response;
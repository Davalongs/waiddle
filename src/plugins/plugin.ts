import { Context } from "hono"
import { StreamProcessor, GeneralPlugin, BaseStreamProcessor } from "./"

export interface Plugin {
    name: string
    description(): string
    forwardHost(): string
    forwardProtocol(): string
    preRequest(c: Context): RequestCallback // Pass only the raw Request?
    postResponse(c: Context): ResponseCallback // Pass only raw Request? Not to pass the context at all?
    newStreamProcessor(): StreamProcessor
}

export class PluginFactory {
    public static getPlugin(c: Context): Plugin {
        return new GeneralPlugin(c)
    }
}

export type RequestCallback = (request: Request, url: string) => Request;
export type ResponseCallback = (response: Response, url: string) => Response;

export abstract class BasePlugin implements Plugin {
    protected _name = 'Base';
    protected _description = 'A base plugin. You can extend it and not care about default behavours';
  
    private _c: Context
  
    constructor(c: Context) {
      this._c = c
    }

    protected get c(): Context {
        return this._c
    }
  
    public get name(): string {
      return this._name;
    }
  
    public description(): string {
      return this._description;
    }
  
    public abstract forwardHost(): string
  
    public abstract forwardProtocol(): string
  
    public preRequest(c: Context): RequestCallback {
        return function(request: Request, url: string): Request {
            return new Request(url, request)
        }
      }
    
    public postResponse(c: Context): ResponseCallback {
        return function(response: Response, url: string): Response {
            return response
        }
    }

    public newStreamProcessor(): StreamProcessor {
        return new BaseStreamProcessor(this.c)
    }
}
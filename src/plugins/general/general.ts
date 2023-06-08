import { Plugin, RequestCallback, ResponseCallback } from "../plugin";
import { Context } from "hono";

export class GeneralPlugin implements Plugin {
  protected static _name = 'General';
  protected static _description = 'A basic plugin to have observability over any api key';

  private c: Context

  constructor(c: Context) {
    this.c = c
  }

  public name(): string {
    return GeneralPlugin._name;
  }

  public description(): string {
    return GeneralPlugin._description;
  }

  public forwardHost(): string {
    // TODO: Define the URI (with protocol) with a token parameter and split url here
    return 'api.openai.com';
  }

  public forwardProtocol(): string {
    // TODO: Define the URI (with protocol) with a token parameter and split protocol here
    return '';
  }

  public preRequest(c: Context): RequestCallback {
    return function(request: Request, url: string): Request {
        console.log("The pre request")
        return new Request(url, request)
    }
  }

  public postResponse(c: Context): ResponseCallback {
    return function(response: Response, url: string): Response {
        console.log("The post response")
        return response
    }
  }
}


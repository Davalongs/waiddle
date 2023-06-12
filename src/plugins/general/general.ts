import { BasePlugin } from "../plugin";
import { Context } from "hono";

export class GeneralPlugin extends BasePlugin {
  protected _name = 'General';
  protected _description = 'A basic plugin to have observability over any api key';

  constructor(c: Context) {
    super(c)
  }

  public forwardHost(): string {
    // TODO: Define the URI (with protocol) with a token parameter and split url here
    return 'api.openai.com';
  }

  public forwardProtocol(): string {
    // TODO: Define the URI (with protocol) with a token parameter and split protocol here
    return 'https';
  }
}


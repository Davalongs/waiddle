import { Plugin } from "../plugin";
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

  public preRequest(c: Context): void {
    console.log("The pre request")
  }

  public async postResponse(c: Context, response: Response): Promise<void> {
    console.log("The post request")
  }
}


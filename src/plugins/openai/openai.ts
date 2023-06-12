import { BasePlugin } from "../plugin";
import { Context } from "hono";
import { BaseStreamProcessor, StreamProcessor } from "../streamProcessor";

export class OpenAIPlugin extends BasePlugin {
  protected _name = 'OpenAI';
  protected _description = 'A plugin to add observability over your openAI tokens';

  constructor(c: Context) {
    super(c)
  }

  public forwardHost(): string {
    return 'api.openai.com';
  }

  public forwardProtocol(): string {
    return 'https';
  }
}
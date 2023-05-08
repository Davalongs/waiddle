# Observer - Cloudflare Worker Reverse Proxy with R2 Storage <!-- omit from toc -->
 
- [Introduction](#introduction)
- [Features](#features)
- [Usage](#usage)
- [Example](#example)
- [OpenAI API Usage](#openai-api-usage)
  - [API common parameters](#api-common-parameters)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)


# Introduction 
Observer is a serverless reverse proxy service built using Cloudflare Workers that proxies incoming requests to a specified target API endpoint. Observer also stores all data that passes through the proxy in a Cloudflare R2 instance for future analytics and debugging purposes.

# Features

*   Reverse proxy for requests to a target API endpoint.
*   Stores all data passing through the proxy in a Cloudflare R2 instance for future analytics.
*   Deployed as a Cloudflare Worker for serverless, scalable and fast performance.

# Usage

1.  Clone the repository and install the dependencies.

```bash
git clone https://github.com/Davalongs/waiddle.git cd waiddle npm install
```

2.  Modify the `wrangler.toml` file to include your Cloudflare account ID and zone ID. You can also set a custom name for the worker.


```toml
name = "worker_name_here"
account_id = "<your-account-id>"
zone_id = "<your-zone-id>"
```

3.  Modify the `src/index.ts` file to configure your target API endpoint and any required extra headers.


```typescript
const target = 'https://api.example.com'; 
const headers = {
    'Content-Type': 'application/json',
    //... <-- Extra headers here
};
```

4.  Deploy the worker using [Wrangler](https://developers.cloudflare.com/workers/tooling/wrangler).



```bash
wrangler publish
```

# Example

A simple example can be run directly form a shell using CURL:

```bash
curl --request POST \
  --url http://localhost:8787/v1/chat/completions \
  --header 'Authorization: Bearer YOUR-OPENAI-API-TOKEN-HERE' \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Hello!"}]
}'
```

It will return the response of the OpenAI API, which will be stored along with the rest of the request's data.
```json
{
	"id": "chatcmpl-7Dbfn7ItIyhvDCMj4EOoan0tnMnuL",
	"object": "chat.completion",
	"created": 1683477435,
	"model": "gpt-3.5-turbo-0301",
	"usage": {
		"prompt_tokens": 10,
		"completion_tokens": 9,
		"total_tokens": 19
	},
	"choices": [
		{
			"message": {
				"role": "assistant",
				"content": "Hello! How can I assist you today?"
			},
			"finish_reason": "stop",
			"index": 0
		}
	]
}
```

# OpenAI API Usage

## API common parameters

There are some parameters needed to compose a proper request to the OpenAPI API

Example request: 

``` bash
curl https://api.openai.com/v1/engines/davinci-codex/completions?prompt=Hello!%20How%20can%20I%20help%20you%3F&max_tokens=150&n=1&temperature=0.7&stop=%5B%22.%22%2C%20%22!%22%5D&frequency_penalty=0.5&presence_penalty=0.5&echo=true
```

* **{model}**: We're using the davinci-codex engine, which is the most powerful OpenAI engine and is capable of performing a wide range of language tasks, including text completion, translation, summarization, and more. This is the closest model to the one used to create me, ChatGPT.

* **prompt**: We've set this to "Hello! How can I help you?", which is a friendly greeting that you can use to start a conversation with me.

* **max_tokens**: We've set this to 150, which is the maximum number of tokens that the API should generate. This should be sufficient to generate a full response to most prompts.
n: We've set this to 1, which means we only want the API to generate one completion.

* **temperature**: We've set this to 0.7, which controls the "creativity" of the generated text. This value is higher than the default of 1, which means that the generated text will be more creative and diverse.

* **stop**: We've set this to [".", "!"], which means the API will stop generating text when it encounters a period or exclamation point. This should help ensure that the generated text is grammatically correct and coherent.

* **frequency_penalty** and **presence_penalty**: We've set these to 0.5, which means we're penalizing the API for repeating words or generating words that weren't present in the input text to some degree. This can help prevent the generated text from being too repetitive or nonsensical.

* **echo**: We've set this to true, which means the prompt will be included in the generated text. This can help ensure that the generated text is directly relevant to the prompt.


# Future Improvements

*   Add support for caching responses from the target API endpoint ***(Not sure yet)***
*   Allow for more flexible and customizable data storage in the R2 instance.
*   Add support for rate limiting and throttling incoming requests.

# Contributing

Contributions are welcome! Please fork the repository and create a pull request with any changes or improvements you would like to make.

# License

AERIAL is licensed under the MIT license. See the [LICENSE](https://github.com/%3Cusername%3E/aerial/blob/main/LICENSE) file for details.

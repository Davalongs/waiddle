# OpenAI API Usage

## Standard OpenAPI Chat Completion

Making a POST request to OpenAI API /chat/completion endpoint with the following body:

{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "Owner", "content": "What is 2+2?"}]
}

Will give a response containing the completed chat message(s) based on the provided input. The response will have a JSON format and will include the generated text(s) based on the provided input. 
The structure of the response will include a choices array containing one or more objects with the generated text and some additional metadata.

Note that giving the "Authorization" header with the OpenAI API Token is required.

Here's an example response structure:

``` json
{
  "choices": [
    {
      "text": " The result of 2+2 is 4.",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "created": 1630632696,
  "model": "text-davinci-002",
  "id": "cmpl-abc123"
}
```

The exact content of the generated text will depend on the model and parameters used in the request.

## Errors

* **Status Code 429**: If too many requests are made in a time lapse, last known number was around 50 in less than 1 hour, the API will give a 429 error response
* **Status Code 400**: If the required parameters are not properly forwarded through the proxy the API will give an error for the missing ones.

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

## ChatGPT (conversational model)

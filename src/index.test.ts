import { test, describe, expect } from 'vitest';
import { handleRequest } from './index';

// Mock event and request objects
const mockRequest = (
	url: string,
	method: string,
	headers: any,
	body: any) => (new Request(
		url, {
		method,
		headers: new Headers(headers),
		body: body
	}
	));

const mockEvent = (request: Request) => ({
	request,
	respondWith: async (response: Response) => ({ response })
});

// This will fail since addEventListener is a browser-based API that is not available in the Node.js environment.
describe('handleRequest function', () => {
	test('should return 404 if proxy URL is not found', async () => {
		const request = mockRequest('https://example.com', 'POST', {}, {});
		const event = mockEvent(request);
		const response = await handleRequest(request);
		expect(response.status).toBe(404);
	});

	test('should return 404 if OpenAI token is not found', async () => {
		const request = mockRequest('https://api.openai.com/endpoint', 'POST', {}, {});
		const event = mockEvent(request);
		const response = await handleRequest(request);
		expect(response.status).toBe(404);
	});

	test('should proxy request to OpenAI API and return response', async () => {
		const requestBody = { text: 'Hello World' };
		const requestHeaders = { Authorization: 'Bearer TOKEN', 'Content-Type': 'application/json' };
		const request = mockRequest('https://example.com/endpoint', 'POST', requestHeaders, requestBody);
		const event = mockEvent(request);
		const response = await handleRequest(request);
		const responseBody = await response.json();
		expect(responseBody).toEqual({ message: 'Hello, World!' });
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
	});
});

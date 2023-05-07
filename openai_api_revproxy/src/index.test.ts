import { describe, expect, it, beforeAll, afterAll, Mock, vi } from "vitest";

// Mock the R2 library
const mockR2 = Mock("put", "getToken");

// Test the proxy
describe("proxy", () => {
	beforeAll(() => {
		// Mock the R2 library's getToken method to return a dummy token
		mockR2.getToken.mockImplementation(async () => "dummy-token");
	});

	it("should proxy requests and store data in R2", async () => {
		// Call the proxy's handleRequest function with a mock request
		const request = new Request("https://example.com/test", {
			method: "POST",
			headers: { Authorization: "dummy-token" },
			body: JSON.stringify({ test: true })
		});
		const response = await handleRequest(request);

		// Check that the response has the expected status and body
		expect(response.status).toEqual(200);
		expect(await response.text()).toEqual('{"success":true}');

		// Check that the R2 library was called with the expected data
		expect(mockR2.put).toHaveBeenCalledTimes(1);
		expect(mockR2.put).toHaveBeenCalledWith(
			JSON.stringify({
				originalRequestData: {
					method: "POST",
					url: "https://example.com/test",
					headers: { Authorization: "dummy-token" }
				},
				proxiedRequestData: {
					method: "POST",
					url: "https://api.openai.com/test",
					headers: {
						Authorization: "dummy-token",
						"Content-Type": "application/json"
					},
					body: { test: true }
				},
				proxiedResponseData: {
					status: 200,
					statusText: "OK",
					headers: { "Content-Type": "application/json" },
					body: '{"success":true}'
				}
			})
		);
	});
});

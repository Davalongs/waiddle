
const superSecret = "PetricorTruman"

// TODO: Initialize a random iv for each encryption operation and store it to reuse it in the decrypt operation.
const fixedIV: Uint8Array = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

export async function EncryptToken(token: string): Promise<string> {
	const text = new TextEncoder().encode(token);

	const key = await getCryptoKey();
	const iv = fixedIV

	const encryptedData = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		text
	);

	const encryptedArrayBuffer = new Uint8Array(encryptedData);
	const combinedIvAndData = new Uint8Array(iv.length + encryptedArrayBuffer.length);
	combinedIvAndData.set(iv);
	combinedIvAndData.set(encryptedArrayBuffer, iv.length);

	return btoa(String.fromCharCode(...combinedIvAndData));
	// We can't use the Buffer class inside a cloudflare worker, so we need to
	// use the deprecated legacy btoa function. When possible, do this:
	// return Buffer.from(combinedIvAndData).toString('base64');
}

async function getCryptoKey(): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const secretKeyData = encoder.encode(superSecret);

	// Hash the secretKeyData using SHA-256
	const hashedSecret = await crypto.subtle.digest("SHA-256", secretKeyData);

	// Import the hashed key for AES-GCM
	return crypto.subtle.importKey(
		"raw",
		hashedSecret,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"]
	);
}
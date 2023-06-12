import { Context } from "hono";

export interface StreamProcessor {
    handleChunk(chunk: Uint8Array): void
    buffer: Uint8Array
}

export class BaseStreamProcessor implements StreamProcessor {
    private _c: Context
    private _buffer: Uint8Array = new Uint8Array()

    constructor(c: Context) {
        this._c = c
        return
    }

    protected get c(): Context {
        return this._c
    }

    public get buffer(): Uint8Array {
        return this._buffer
    }

    public async handleChunk(chunk: Uint8Array): Promise<void> {
        await this.appendToBuffer(chunk)
    }

    protected async appendToBuffer(chunk: Uint8Array): Promise<void> {
        const transformedChunk = await this.transformChunk(chunk)
        const newBuffer = new Uint8Array(this._buffer.length + transformedChunk.length)
        newBuffer.set(transformedChunk, this._buffer.length)
        this._buffer = newBuffer
    }

    // You can override this function when extend the base class
    // and tread it here.
    protected async transformChunk(chunk: Uint8Array): Promise<Uint8Array> {
        return chunk
    }
}
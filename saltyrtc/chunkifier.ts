/**
 * Convert an array to chunks.
 *
 * This is required for now as a workaround because the Chrome implementation
 * does not currently support sending messages larger than 16 KiB:
 * https://webrtc.org/web-apis/chrome/
 *
 * The chunkifier returns a list of `Uint8Array` instances. The first bit of
 * each chunk indicates, whether there are more chunks following (1) or not (0).
 *
 * The chunk size includes this byte, so if you want to transfer exactly 10
 * elements per chunk, choose a chunk size of 11.
 */
export class Chunkifier {
    private array: Uint8Array;
    private chunkSize: number;
    private chunks: Uint8Array[] = null;

    constructor(array: Uint8Array, chunkSize: number) {
        if (array.length < 1) {
            throw new RangeError('Array may not be empty');
        }
        if (chunkSize < 2) {
            throw new RangeError('Chunk size must be larger than 1');
        }
        this.array = array;
        this.chunkSize = chunkSize;
    }

    private offset(chunkIndex: number): number {
        return chunkIndex * (this.chunkSize - 1);
    }

    private hasNext(index: number): boolean {
        return this.offset(index) < this.array.length;
    }

    public getChunks(): Uint8Array[] {
        // Generate chunks on demand
        if (this.chunks === null) {
            this.chunks = [];
            let index = 0;
            while (this.hasNext(index)) {
                // More chunks?
                let offset = this.offset(index);
                let length = Math.min(this.chunkSize, this.array.length + 1 - offset);
                let buffer = new ArrayBuffer(length);
                let view = new DataView(buffer);

                // Put more chunks indicator into buffer
                if (this.hasNext(index + 1)) {
                    view.setUint8(0, 1);
                } else {
                    view.setUint8(0, 0);
                }

                // Add array slice to buffer
                let array = new Uint8Array(buffer);
                let end = Math.min(this.offset(index + 1), this.array.length);
                let chunk = this.array.slice(offset, end);
                array.set(chunk, 1);

                // Add array to list of chunks
                this.chunks[index] = array;
                index += 1;
            }
        }
        return this.chunks;
    }
}


/**
 * Combine chunks into a single array.
 *
 * See `Chunkifier` doc comment for more information.
 */
export class Unchunkifier {

    private chunks: Uint8Array[] = [];
    private length = 0;
    private done = false;
    private merged: Uint8Array = null;

    /**
     * Add a chunk. Return a boolean indicating whether all chunks have been
     * processed.
     */
    public add(array: Uint8Array): boolean {
        if (this.done) {
            throw new Error('Cannot add more chunks, already complete');
        }
        if (array.length == 0) {
            return;
        }

        let view = new DataView(array.buffer);

        // Add to list
        this.chunks.push(array);
        this.length += (array.length - 1);

        // More chunks?
        let moreChunks = view.getUint8(0);
        if (moreChunks === 0) {
            this.done = true;
            return true;
        } else if (moreChunks === 1) {
            return false;
        }
        throw new Error('Invalid chunk received: ' + moreChunks);
    }

    public merge() {
        // Chunks must be complete
        if (!this.done) {
            throw new Error('Chunks not yet complete');
        }

        // Return cached value if available
        if (this.merged !== null) {
            return this.merged;
        }

        // Add all chunks apart from the first byte
        let array = new Uint8Array(this.length);
        let offset = 0;
        for (var chunk of this.chunks) {
            array.set(chunk.slice(1), offset);
            offset += chunk.length - 1;
        }

        // Cache value
        this.merged = array;

        return array;
    }
}

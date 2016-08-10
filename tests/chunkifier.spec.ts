/// <reference path="jasmine.d.ts" />

import { Chunkifier, Unchunkifier } from "../saltyrtc/chunkifier";

const MORE = 1;
const DONE = 0;


export default () => { describe('chunkifier', function() {

    describe('Chunkifier', function() {
        it('chunkifies multiples of the chunk size', () => {
            const arr = Uint8Array.of(1, 2, 3, 4, 5, 6);
            const chunkifier = new Chunkifier(arr, 2+1);
            const chunks: Uint8Array[] = chunkifier.getChunks();
            expect(chunks).toEqual([
                Uint8Array.of(MORE, 1, 2),
                Uint8Array.of(MORE, 3, 4),
                Uint8Array.of(DONE, 5, 6),
            ]);
        });

        it('chunkifies non-multiples of the chunk size', () => {
            const arr = Uint8Array.of(1, 2, 3, 4, 5, 6);
            const chunkifier = new Chunkifier(arr, 4+1);
            const chunks: Uint8Array[] = chunkifier.getChunks();
            expect(chunks).toEqual([
                Uint8Array.of(MORE, 1, 2, 3, 4),
                Uint8Array.of(DONE, 5, 6),
            ]);
        });

        it('chunkifies data smaller than the chunk size', () => {
            const arr = Uint8Array.of(1, 2);
            const chunkifier = new Chunkifier(arr, 99);
            const chunks: Uint8Array[] = chunkifier.getChunks();
            expect(chunks).toEqual([
                Uint8Array.of(DONE, 1, 2),
            ]);
        });

        it('allows a chunk size of 2', () => {
            const arr = Uint8Array.of(1, 2, 3);
            const chunkifier = new Chunkifier(arr, 2);
            const chunks: Uint8Array[] = chunkifier.getChunks();
            expect(chunks).toEqual([
                Uint8Array.of(MORE, 1),
                Uint8Array.of(MORE, 2),
                Uint8Array.of(DONE, 3),
            ]);
        });

        it('does not chunkify empty arrays', () => {
            const create = () => new Chunkifier(new Uint8Array([]), 5);
            expect(create).toThrow(new RangeError('Array may not be empty'));
        });

        it('does not allow a chunk size of 0', () => {
            const arr = Uint8Array.of(1, 2);
            const create = () => new Chunkifier(arr, 0);
            expect(create).toThrow(new RangeError('Chunk size must be larger than 1'));
        });

        it('does not allow a chunk size of 1', () => {
            const arr = Uint8Array.of(1, 2);
            const create = () => new Chunkifier(arr, 1);
            expect(create).toThrow(new RangeError('Chunk size must be larger than 1'));
        });

        it('does not allow a negative chunk size', () => {
            const arr = Uint8Array.of(1, 2);
            const create = () => new Chunkifier(arr, -1);
            expect(create).toThrow(new RangeError('Chunk size must be larger than 1'));
        });
    });

    describe('Unchunkifier', function() {
        it('merges chunks', () => {
            const chunks = [
                Uint8Array.of(MORE, 1, 2),
                Uint8Array.of(MORE, 3, 4),
                Uint8Array.of(DONE, 5, 6),
            ];
            const unchunkifier = new Unchunkifier();
            for (let chunk  of chunks) { unchunkifier.add(chunk); }
            expect(unchunkifier.merge()).toEqual(Uint8Array.of(1, 2, 3, 4, 5, 6));
        });

        it('merges differently sized chunks', () => {
            const chunks = [
                Uint8Array.of(MORE, 1, 2, 3),
                Uint8Array.of(MORE, 4),
                Uint8Array.of(DONE, 5, 6),
            ];
            const unchunkifier = new Unchunkifier();
            for (let chunk  of chunks) { unchunkifier.add(chunk); }
            expect(unchunkifier.merge()).toEqual(Uint8Array.of(1, 2, 3, 4, 5, 6));
        });

        it('cannot merge before done', () => {
            const unchunkifier = new Unchunkifier();
            unchunkifier.add(Uint8Array.of(MORE, 1, 2));
            unchunkifier.add(Uint8Array.of(MORE, 3, 4));
            const merge = () => unchunkifier.merge();
            expect(merge).toThrowError('Chunks not yet complete');
        });

        it('cannot add after done', () => {
            const unchunkifier = new Unchunkifier();
            unchunkifier.add(Uint8Array.of(MORE, 1, 2));
            unchunkifier.add(Uint8Array.of(DONE, 3, 4));
            const add = () => unchunkifier.add(Uint8Array.of(MORE, 5, 6));
            expect(add).toThrowError('Cannot add more chunks, already complete');
        });

        it('cannot add invalid chunks', () => {
            const unchunkifier = new Unchunkifier();
            const add = () => unchunkifier.add(Uint8Array.of(2, 3, 4));
            expect(add).toThrowError('Invalid chunk received: 2');
        });

        it('does not complain about empty chunks', () => {
            const chunks = [
                Uint8Array.of(MORE, 1),
                new Uint8Array([]),
                Uint8Array.of(DONE, 2),
            ];
            const unchunkifier = new Unchunkifier();
            for (let chunk  of chunks) { unchunkifier.add(chunk); }
            expect(unchunkifier.merge()).toEqual(Uint8Array.of(1, 2));
        });

        it('returns the right value on add', () => {
            const unchunkifier = new Unchunkifier();
            expect(unchunkifier.add(Uint8Array.of(MORE, 1, 2))).toEqual(false);
            expect(unchunkifier.add(Uint8Array.of(MORE, 3, 4))).toEqual(false);
            expect(unchunkifier.add(Uint8Array.of(DONE, 5, 6))).toEqual(true);
        });
    });

}); };

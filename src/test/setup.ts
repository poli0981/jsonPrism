import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest's jsdom env hosts `TextEncoder.encode` in a different Uint8Array
// realm than the test's global. Libraries that gate behavior on
// `instanceof Uint8Array` (e.g. fflate) then misread the bytes as a generic
// directory object. Wrap the encoder output in a same-realm Uint8Array so
// the check passes.
const originalEncode = TextEncoder.prototype.encode;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TextEncoder.prototype as any).encode = function encode(this: TextEncoder, input?: string) {
  const r = originalEncode.call(this, input) as Uint8Array;
  if (r instanceof Uint8Array) return r;
  const view = r as unknown as { buffer: ArrayBufferLike; byteOffset: number; byteLength: number };
  return new Uint8Array(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength);
};

// jsdom's Blob ships without an `arrayBuffer()` that round-trips binary
// data cleanly through `Response`. Swap in Node's native Blob for tests.
if (typeof window !== 'undefined') {
  const { Blob: NodeBlob } = await import('node:buffer');
  (window as unknown as { Blob: typeof Blob }).Blob = NodeBlob as unknown as typeof Blob;
  globalThis.Blob = NodeBlob as unknown as typeof Blob;
}

// jsdom's localStorage is an empty `{}` placeholder in Vitest's jsdom env;
// provide a minimal in-memory shim per test so storage code paths work.
beforeEach(() => {
  const store = new Map<string, string>();
  const ls: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: ls,
  });
});

afterEach(() => {
  cleanup();
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '../download';

interface ClickedAnchor {
  href: string;
  download: string;
  rel: string;
  attached: boolean;
}

let clicked: ClickedAnchor[];
const createObjectURL = vi.fn((_blob: Blob) => 'blob:http://localhost/fake-id');
const revokeObjectURL = vi.fn((_url: string) => {});

beforeEach(() => {
  vi.useFakeTimers();
  clicked = [];
  // jsdom implements neither object URLs nor navigation on anchor clicks.
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push({
      href: this.href,
      download: this.download,
      rel: this.rel,
      attached: document.body.contains(this),
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('downloadBlob', () => {
  it('clicks a temporary attached anchor pointing at an object URL', () => {
    const blob = new Blob(['a,b\n1,2'], { type: 'text/csv' });

    downloadBlob(blob, 'output.csv');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([
      {
        href: 'blob:http://localhost/fake-id',
        download: 'output.csv',
        rel: 'noopener',
        attached: true,
      },
    ]);
    // The anchor is removed again right after the click.
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('revokes the object URL only after a grace period', () => {
    downloadBlob(new Blob(['{}']), 'output.json');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(29_999);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-id');
  });
});

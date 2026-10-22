import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  basenameFromPath,
  fileFromNativePath,
  isTauri,
  nativeOpenFiles,
  nativeSaveBlob,
  openExternal,
  pathHashAsMillis,
  tauriHostInfo,
} from '@/lib/tauri';

const dialog = vi.hoisted(() => ({ open: vi.fn(), save: vi.fn() }));
const fs = vi.hoisted(() => ({ readTextFile: vi.fn(), writeFile: vi.fn(), stat: vi.fn() }));
const opener = vi.hoisted(() => ({ openUrl: vi.fn() }));
const core = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/plugin-dialog', () => dialog);
vi.mock('@tauri-apps/plugin-fs', () => fs);
vi.mock('@tauri-apps/plugin-opener', () => opener);
vi.mock('@tauri-apps/api/core', () => core);

type TauriGlobal = '__TAURI__' | '__TAURI_INTERNALS__';
type TauriWindow = Window & Partial<Record<TauriGlobal, unknown>>;

/** Simulates the desktop bundle: build flag on and the IPC bridge injected. */
function enterTauri(global: TauriGlobal = '__TAURI_INTERNALS__'): void {
  vi.stubGlobal('__IS_TAURI_BUILD__', true);
  (window as TauriWindow)[global] = {};
}

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as TauriWindow).__TAURI__;
  delete (window as TauriWindow).__TAURI_INTERNALS__;
});

describe('isTauri', () => {
  it('is false in the web build even if Tauri globals are present', () => {
    (window as TauriWindow).__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(false);
  });

  it('detects the Tauri 2 IPC bridge in a Tauri build', () => {
    enterTauri('__TAURI_INTERNALS__');
    expect(isTauri()).toBe(true);
  });

  it('detects the global Tauri API object in a Tauri build', () => {
    enterTauri('__TAURI__');
    expect(isTauri()).toBe(true);
  });

  it('is false when a Tauri build is opened in a plain browser', () => {
    vi.stubGlobal('__IS_TAURI_BUILD__', true);
    expect(isTauri()).toBe(false);
  });

  it('is false when there is no window (e.g. inside a worker)', () => {
    enterTauri();
    vi.stubGlobal('window', undefined);
    expect(isTauri()).toBe(false);
  });
});

describe('nativeOpenFiles', () => {
  const filters = [{ name: 'JSON', extensions: ['json'] }];

  it('returns null on the web without loading the dialog plugin', async () => {
    await expect(nativeOpenFiles({ filters })).resolves.toBeNull();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('returns every path picked in a multi-select dialog', async () => {
    enterTauri();
    dialog.open.mockResolvedValue(['/home/me/a.json', '/home/me/b.json']);

    await expect(nativeOpenFiles({ multiple: true, filters })).resolves.toEqual([
      '/home/me/a.json',
      '/home/me/b.json',
    ]);
    expect(dialog.open).toHaveBeenCalledWith({ multiple: true, filters });
  });

  it('wraps a single selection in an array and defaults to single-select', async () => {
    enterTauri();
    dialog.open.mockResolvedValue('C:\\Users\\me\\data.json');

    await expect(nativeOpenFiles({ filters })).resolves.toEqual(['C:\\Users\\me\\data.json']);
    expect(dialog.open).toHaveBeenCalledWith({ multiple: false, filters });
  });

  it('returns null when the user cancels the dialog', async () => {
    enterTauri();
    dialog.open.mockResolvedValue(null);
    await expect(nativeOpenFiles({ filters })).resolves.toBeNull();
  });
});

describe('nativeSaveBlob', () => {
  const zipFilter = { name: 'Zip archive', extensions: ['zip'] };

  it('returns null on the web without opening a dialog', async () => {
    await expect(nativeSaveBlob(new Blob(['x']), 'out.zip', zipFilter)).resolves.toBeNull();
    expect(dialog.save).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('writes the blob bytes to the chosen path', async () => {
    enterTauri();
    dialog.save.mockResolvedValue('/home/me/out.zip');
    fs.writeFile.mockResolvedValue(undefined);

    const saved = await nativeSaveBlob(new Blob([new Uint8Array([1, 2, 3])]), 'out.zip', zipFilter);

    expect(saved).toBe('/home/me/out.zip');
    expect(dialog.save).toHaveBeenCalledWith({
      defaultPath: 'out.zip',
      filters: [zipFilter, { name: '*', extensions: ['*'] }],
    });
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    const [path, bytes] = fs.writeFile.mock.calls[0] as [string, Uint8Array];
    expect(path).toBe('/home/me/out.zip');
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it('writes nothing when the save dialog is cancelled', async () => {
    enterTauri();
    dialog.save.mockResolvedValue(null);

    await expect(nativeSaveBlob(new Blob(['x']), 'out.zip', zipFilter)).resolves.toBeNull();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});

describe('fileFromNativePath', () => {
  it('refuses to read native paths outside Tauri', async () => {
    await expect(fileFromNativePath('/home/me/data.json')).rejects.toThrow(
      'nativeReadText is only available inside Tauri.',
    );
    expect(fs.readTextFile).not.toHaveBeenCalled();
  });

  it('builds a File with the basename, MIME type and real mtime', async () => {
    enterTauri();
    const mtime = new Date('2026-05-01T10:00:00Z');
    fs.readTextFile.mockResolvedValue('{"a":1}');
    fs.stat.mockResolvedValue({ mtime });

    const file = await fileFromNativePath('C:\\Users\\me\\data.json');

    expect(fs.readTextFile).toHaveBeenCalledWith('C:\\Users\\me\\data.json');
    expect(file.name).toBe('data.json');
    expect(file.type).toBe('application/json');
    expect(file.lastModified).toBe(mtime.getTime());
    await expect(file.text()).resolves.toBe('{"a":1}');
  });

  it.each([
    ['/data/people.YML', 'application/yaml'],
    ['/data/events.ndjson', 'application/x-ndjson'],
    ['/data/table.tsv', 'text/tab-separated-values'],
    ['/data/strings.resx', 'application/xml'],
    ['/data/archive.bin', 'application/octet-stream'],
  ])('maps %s to %s', async (path, type) => {
    enterTauri();
    fs.readTextFile.mockResolvedValue('x');
    fs.stat.mockResolvedValue({ mtime: new Date(0) });

    const file = await fileFromNativePath(path);
    expect(file.type).toBe(type);
  });

  it('falls back to a stable path hash when stat() has no mtime', async () => {
    enterTauri();
    fs.readTextFile.mockResolvedValue('[]');
    fs.stat.mockResolvedValue({ mtime: null });

    const path = '/home/me/data.json';
    const first = await fileFromNativePath(path);
    const second = await fileFromNativePath(path);

    expect(first.lastModified).toBe(pathHashAsMillis(path));
    expect(second.lastModified).toBe(first.lastModified);
  });

  it('falls back to the path hash when stat() fails (Android content URI)', async () => {
    enterTauri();
    const uri =
      'content://com.android.providers.downloads.documents/document/raw%3A%2Fstorage%2FDownload%2Fdata.json';
    fs.readTextFile.mockResolvedValue('{}');
    fs.stat.mockRejectedValue(new Error('forbidden path'));

    const file = await fileFromNativePath(uri);

    expect(file.name).toBe('data.json');
    expect(file.type).toBe('application/json');
    expect(file.lastModified).toBe(pathHashAsMillis(uri));
  });

  it('propagates read failures', async () => {
    enterTauri();
    fs.readTextFile.mockRejectedValue(new Error('permission denied'));
    await expect(fileFromNativePath('/root/secret.json')).rejects.toThrow('permission denied');
    expect(fs.stat).not.toHaveBeenCalled();
  });
});

describe('basenameFromPath edge cases', () => {
  it('keeps a path that ends with a separator instead of returning an empty name', () => {
    expect(basenameFromPath('/home/me/')).toBe('/home/me/');
  });

  it('keeps the raw basename of a content URI with a malformed escape', () => {
    expect(basenameFromPath('content://provider/document/bad%E0%A4%A.json')).toBe(
      'bad%E0%A4%A.json',
    );
  });

  it('keeps a content URI document id that ends with a colon', () => {
    expect(basenameFromPath('content://provider/document/primary%3A')).toBe('primary:');
  });
});

describe('openExternal', () => {
  it('opens a new tab without opener access on the web', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    await openExternal('https://example.com/docs');

    expect(open).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
    expect(opener.openUrl).not.toHaveBeenCalled();
  });

  it('hands the URL to the system browser inside Tauri', async () => {
    enterTauri();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    opener.openUrl.mockResolvedValue(undefined);

    await openExternal('https://example.com/docs');

    expect(opener.openUrl).toHaveBeenCalledWith('https://example.com/docs');
    expect(open).not.toHaveBeenCalled();
  });
});

describe('tauriHostInfo', () => {
  it('returns null on the web', async () => {
    await expect(tauriHostInfo()).resolves.toBeNull();
    expect(core.invoke).not.toHaveBeenCalled();
  });

  it('asks the Rust side for host diagnostics inside Tauri', async () => {
    enterTauri();
    const info = { os: 'windows', arch: 'x86_64', family: 'windows', app_version: '2.0.0' };
    core.invoke.mockResolvedValue(info);

    await expect(tauriHostInfo()).resolves.toEqual(info);
    expect(core.invoke).toHaveBeenCalledWith('host_info');
  });
});

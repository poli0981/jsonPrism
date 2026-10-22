import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { toast } from 'sonner';
import '@/i18n';
import { About } from '../About';
import { CONTACTS, REPO_URL, SITE_URL } from '@/lib/links';
import { clearLogs, createLogger } from '@/lib/logger';
import { tauriHostInfo } from '@/lib/tauri';

vi.mock('@/lib/tauri', () => ({ tauriHostInfo: vi.fn(async () => null) }));

const BLOB = `${REPO_URL}/blob/main`;

/** jsdom has no Clipboard API. Don't mix with userEvent.setup(), which installs its own. */
function stubClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: spy } });
  return spy;
}

const copyButton = () => screen.getByRole('button', { name: 'Copy diagnostics' });

/** Click "Copy diagnostics" and let the async copy settle. */
async function copyDiagnostics() {
  fireEvent.click(copyButton());
  await act(() => vi.advanceTimersByTimeAsync(0));
}

/** The <dd> paired with a build-info <dt>. */
const buildValue = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'clipboard');
  clearLogs();
});

describe('About page', () => {
  it('introduces the project in a keyboard-scrollable region with a page title', () => {
    render(<About />);
    expect(screen.getByRole('heading', { level: 1, name: 'About JSONPrism' })).toBeInTheDocument();
    expect(document.title).toBe('About JSONPrism');
    expect(screen.getByText('A refracting tool for developers.')).toBeInTheDocument();
    expect(screen.getByLabelText('About JSONPrism')).toHaveAttribute('tabindex', '0');
  });

  it('summarises privacy for the web build and links the full policy', () => {
    render(<About />);
    const section = screen.getByRole('heading', { name: 'Your data' }).closest('section');
    expect(section).toHaveTextContent(/Conversion happens in your browser/);
    expect(screen.getByRole('link', { name: 'Read the full Privacy Policy →' })).toHaveAttribute(
      'href',
      `${BLOB}/PRIVACY.md`,
    );
  });

  it('lists every way to support the project', () => {
    render(<About />);
    const donate = {
      'GitHub Sponsors': 'https://github.com/sponsors/poli0981',
      'Ko-fi': 'https://ko-fi.com/skullmute',
      'Buy Me a Coffee': 'https://www.buymeacoffee.com/skullmute',
      Patreon: 'https://patreon.com/skullmute',
      PayPal: 'https://paypal.me/DungDang212',
    };
    for (const [name, href] of Object.entries(donate)) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
    }
  });

  it('links the community and the private contact addresses', () => {
    render(<About />);
    const community = {
      'Discord (dev community)': 'https://discord.gg/2aNR3aVt',
      'X (Twitter)': 'https://twitter.com/SkullMute0011',
      Bluesky: 'https://bsky.app/profile/skullmute0011.bsky.social',
      Mastodon: 'https://mastodon.social/@skullmute1122',
      Telegram: 'https://t.me/SkullMute0011',
      YouTube: 'https://youtube.com/@SkullMute',
    };
    for (const [name, href] of Object.entries(community)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }

    const contacts = {
      'Project & conduct': CONTACTS.code,
      'Security reports': CONTACTS.security,
      'Privacy requests': CONTACTS.privacy,
      'Legal & licensing': CONTACTS.legal,
      Sponsorship: CONTACTS.sponsor,
    };
    for (const [label, email] of Object.entries(contacts)) {
      const value = screen.getByText(label, { selector: 'dt' }).nextElementSibling;
      expect(within(value as HTMLElement).getByRole('link', { name: email })).toHaveAttribute(
        'href',
        `mailto:${email}`,
      );
    }
  });

  it('credits third-party projects by category', () => {
    render(<About />);
    const categories = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(categories).toEqual([
      'UI framework',
      'Code editor',
      'Parsers & serializers',
      'Build & tooling',
      'Desktop (Tauri)',
      'Internationalization',
      'Web (Cloudflare)',
    ]);
    expect(screen.getByRole('link', { name: 'CodeMirror 6' })).toHaveAttribute(
      'href',
      'https://codemirror.net/',
    );
    expect(screen.getByRole('link', { name: 'See the full list →' })).toHaveAttribute(
      'href',
      `${BLOB}/THIRD-PARTY.md`,
    );
  });

  it('shows the build version, commit, date and platform', () => {
    render(<About />);
    expect(buildValue('Version')).toHaveTextContent(__APP_VERSION__);
    expect(within(buildValue('Commit') as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      `${REPO_URL}/commit/${__APP_COMMIT__}`,
    );
    expect(buildValue('Built on')).toHaveTextContent(__APP_BUILD_DATE__);
    expect(buildValue('Platform')).toHaveTextContent('Web');
    expect(screen.getByText(`Version ${__APP_VERSION__}`)).toBeInTheDocument();
  });

  it('links the repository, issue tracker, releases and license', () => {
    render(<About />);
    const links = {
      'Source code': REPO_URL,
      'Report a bug': `${REPO_URL}/issues`,
      Discussions: `${REPO_URL}/discussions`,
      'Web app': SITE_URL,
      'Releases & downloads': `${REPO_URL}/releases`,
      'License (Apache 2.0)': `${BLOB}/LICENSE`,
    };
    for (const [name, href] of Object.entries(links)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});

describe('Copy diagnostics', () => {
  it('copies version, platform, browser and recent log lines for bug reports', async () => {
    vi.useFakeTimers();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const writeText = stubClipboard(async () => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    createLogger('convert').warn('Slow conversion', 1200);
    render(<About />);
    expect(copyButton().querySelector('svg')).toHaveClass('lucide-clipboard-copy');

    await copyDiagnostics();
    expect(writeText).toHaveBeenCalledTimes(1);
    const lines = (writeText.mock.calls[0]?.[0] ?? '').split('\n');
    expect(lines.slice(0, 6)).toEqual([
      `JSONPrism ${__APP_VERSION__} (${__APP_COMMIT__}, built ${__APP_BUILD_DATE__})`,
      'Platform: web',
      `User agent: ${navigator.userAgent}`,
      'Language: en',
      '',
      'Recent log:',
    ]);
    expect(lines[6]).toMatch(/^\d{4}-\d{2}-\d{2}T\S+ WARN \[convert\] Slow conversion 1200$/);
    expect(success).toHaveBeenCalledWith('Diagnostics copied — paste them into your bug report.');
    expect(copyButton().querySelector('svg')).toHaveClass('lucide-check');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(copyButton().querySelector('svg')).toHaveClass('lucide-clipboard-copy');
  });

  it('adds OS details when the native host reports them', async () => {
    vi.useFakeTimers();
    vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const writeText = stubClipboard(async () => {});
    vi.mocked(tauriHostInfo).mockResolvedValueOnce({
      os: 'windows',
      arch: 'x86_64',
      family: 'windows',
      app_version: '2.0.0',
    });
    render(<About />);

    await copyDiagnostics();
    expect(writeText.mock.calls[0]?.[0]).toContain('\nPlatform: web · windows x86_64\n');
  });

  it('still copies when the host lookup fails', async () => {
    vi.useFakeTimers();
    vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const writeText = stubClipboard(async () => {});
    vi.mocked(tauriHostInfo).mockRejectedValueOnce(new Error('IPC unavailable'));
    render(<About />);

    await copyDiagnostics();
    expect(writeText.mock.calls[0]?.[0]).toContain('\nPlatform: web\n');
  });

  it('reports a clipboard failure without claiming success', async () => {
    vi.useFakeTimers();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const failure = vi.spyOn(toast, 'error').mockImplementation(() => 1);
    stubClipboard(() => Promise.reject(new DOMException('Denied', 'NotAllowedError')));
    render(<About />);

    await copyDiagnostics();
    expect(failure).toHaveBeenCalledWith("Couldn't copy to clipboard");
    expect(success).not.toHaveBeenCalled();
    expect(copyButton().querySelector('svg')).toHaveClass('lucide-clipboard-copy');
  });
});

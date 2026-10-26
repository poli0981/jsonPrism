import { describe, expect, it } from 'vitest';
import { clientKey } from '../rate-limit';

const from = (ip?: string) =>
  new Request('https://jsonprism.poli0981.dev/', {
    headers: ip === undefined ? {} : { 'CF-Connecting-IP': ip },
  });

describe('clientKey', () => {
  it('keys IPv4 clients on the full address', () => {
    expect(clientKey(from('203.0.113.9'))).toBe('203.0.113.9');
  });

  it('keys IPv6 clients on their /64 network', () => {
    const a = clientKey(from('2001:db8:85a3:42:1:2:3:4'));
    expect(a).toBe('2001:db8:85a3:42::/64');
    expect(clientKey(from('2001:db8:85a3:42:ffff::1'))).toBe(a);
    expect(clientKey(from('2001:DB8:85A3:0042::9'))).toBe(a);
    expect(clientKey(from('2001:db8:85a3:43::1'))).not.toBe(a);
  });

  it('expands :: wherever it appears', () => {
    expect(clientKey(from('2001:db8::1'))).toBe('2001:db8:0:0::/64');
    expect(clientKey(from('::1'))).toBe('0:0:0:0::/64');
    expect(clientKey(from('2001:db8:1:2::'))).toBe('2001:db8:1:2::/64');
  });

  it('keeps IPv4-mapped IPv6 addresses whole', () => {
    expect(clientKey(from('::ffff:192.0.2.1'))).toBe('::ffff:192.0.2.1');
  });

  it('falls back to a shared key without the header', () => {
    expect(clientKey(from())).toBe('unknown');
    expect(clientKey(from(''))).toBe('unknown');
  });
});

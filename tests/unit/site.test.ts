import { describe, expect, it } from 'vitest';
import { makeSite } from '../../src/lib/core';
import { inkOn, paras, safeUrl, siteFileName, siteHtml } from '../../src/lib/site';

describe('website builder', () => {
  it('escapes everything you type, so text can never become code', () => {
    const s = { ...makeSite('Test'), title: '<script>alert(1)</script>', about: 'a & b "c"', sections: [{ heading: '<img src=x onerror=1>', text: 'ok' }] };
    const html = siteHtml(s);
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('a &amp; b &quot;c&quot;');
    expect(html).not.toMatch(/<script/i);
  });

  it('only keeps web and mail links', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('file:///etc/passwd')).toBeNull();
    expect(safeUrl('localhost')).toBeNull();
    expect(safeUrl('example.com')).toBe('https://example.com/');
    expect(safeUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
    expect(safeUrl('mailto:me@example.com')).toBe('mailto:me@example.com');
    const s = { ...makeSite('x'), links: [{ label: 'Bad', url: 'javascript:alert(1)' }, { label: 'Good', url: 'example.com' }] };
    const html = siteHtml(s);
    expect(html).toContain('href="https://example.com/"');
    expect(html).not.toContain('Bad');
  });

  it('turns blank lines into paragraphs', () => {
    expect(paras('one\ntwo\n\nthree')).toBe('<p>one<br>two</p>\n<p>three</p>');
  });

  it('picks readable text on the accent colour', () => {
    expect(inkOn('#FFE14D')).toBe('#0b0b10');
    expect(inkOn('#1d2b6b')).toBe('#ffffff');
  });

  it('makes a tidy file name', () => {
    expect(siteFileName({ ...makeSite('Mijn Pixel-site!'), name: 'Mijn Pixel-site! é' })).toBe('mijn-pixel-site-e.html');
  });

  it('every template produces a complete page', () => {
    for (const t of ['neon', 'licht', 'krant'] as const) {
      const html = siteHtml({ ...makeSite('A', t), tagline: 'b', about: 'c', sections: [{ heading: 'd', text: 'e' }], links: [{ label: 'f', url: 'g.be' }] });
      expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
      expect(html).toContain('<h1>A</h1>');
      expect(html).toContain('<h2>d</h2>');
    }
  });
});

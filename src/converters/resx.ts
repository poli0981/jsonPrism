import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';
import { compareOrdinal, defineOwn } from '@/lib/json';

interface ResxOptions {
  /**
   * If a value is an object with this key, its sibling `value` is used
   * as the resource and this key's value becomes the `<comment>` element.
   * Example with default `_comment`:
   *   `{ "WelcomeMsg": { "value": "Hi", "_comment": "Greeting" } }`
   */
  commentKey: string;
  /** Emit the standard xsd:schema header. Visual Studio expects it. */
  includeSchema: boolean;
  /** Sort entries alphabetically — useful for stable diffs across locales. */
  sortKeys: boolean;
}

/**
 * Standard RESX 2.0 schema header. Bytes are aligned with output produced by
 * Visual Studio's .resx editor so round-tripping doesn't churn diffs.
 *
 * Source: https://learn.microsoft.com/en-us/dotnet/framework/resources/working-with-resx-files-programmatically
 */
const RESX_SCHEMA = `  <!--
    Microsoft ResX Schema

    Version 2.0

    The primary goals of this format are to allow a simple XML format
    that is mostly human readable. The generation and parsing of the
    various data types are done through the TypeConverter classes
    associated with the data types.
  -->
  <xsd:schema id="root" xmlns="" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:msdata="urn:schemas-microsoft-com:xml-msdata">
    <xsd:import namespace="http://www.w3.org/XML/1998/namespace" />
    <xsd:element name="root" msdata:IsDataSet="true" msdata:UseCurrentLocale="true">
      <xsd:complexType>
        <xsd:choice maxOccurs="unbounded">
          <xsd:element name="metadata">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="value" type="xsd:string" minOccurs="0" />
              </xsd:sequence>
              <xsd:attribute name="name" use="required" type="xsd:string" />
              <xsd:attribute name="type" type="xsd:string" />
              <xsd:attribute name="mimetype" type="xsd:string" />
              <xsd:attribute ref="xml:space" />
            </xsd:complexType>
          </xsd:element>
          <xsd:element name="assembly">
            <xsd:complexType>
              <xsd:attribute name="alias" type="xsd:string" />
              <xsd:attribute name="name" type="xsd:string" />
            </xsd:complexType>
          </xsd:element>
          <xsd:element name="data">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="value" type="xsd:string" minOccurs="0" msdata:Ordinal="1" />
                <xsd:element name="comment" type="xsd:string" minOccurs="0" msdata:Ordinal="2" />
              </xsd:sequence>
              <xsd:attribute name="name" type="xsd:string" use="required" msdata:Ordinal="1" />
              <xsd:attribute name="type" type="xsd:string" msdata:Ordinal="3" />
              <xsd:attribute name="mimetype" type="xsd:string" msdata:Ordinal="4" />
              <xsd:attribute ref="xml:space" />
            </xsd:complexType>
          </xsd:element>
          <xsd:element name="resheader">
            <xsd:complexType>
              <xsd:sequence>
                <xsd:element name="value" type="xsd:string" minOccurs="0" msdata:Ordinal="1" />
              </xsd:sequence>
              <xsd:attribute name="name" type="xsd:string" use="required" />
            </xsd:complexType>
          </xsd:element>
        </xsd:choice>
      </xsd:complexType>
    </xsd:element>
  </xsd:schema>`;

/**
 * The four resheaders are required by ResXResourceReader regardless of whether
 * the xsd:schema block is present, so they are always emitted.
 */
const RESX_RESHEADERS = `  <resheader name="resmimetype">
    <value>text/microsoft-resx</value>
  </resheader>
  <resheader name="version">
    <value>2.0</value>
  </resheader>
  <resheader name="reader">
    <value>System.Resources.ResXResourceReader, System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089</value>
  </resheader>
  <resheader name="writer">
    <value>System.Resources.ResXResourceWriter, System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089</value>
  </resheader>`;

export const resxConverter: Converter<ResxOptions> = {
  meta: {
    id: 'resx',
    labelKey: 'formats.resx',
    extension: 'resx',
    mimeType: 'application/xml',
    phase: 3,
    ready: true,
  },
  defaultOptions: {
    commentKey: '_comment',
    includeSchema: true,
    sortKeys: false,
  },
  optionSchema: [
    {
      type: 'string',
      key: 'commentKey',
      labelKey: 'options.resx.comment_key',
      descriptionKey: 'options.resx.comment_key_desc',
      placeholder: '_comment',
    },
    {
      type: 'boolean',
      key: 'includeSchema',
      labelKey: 'options.resx.include_schema',
      descriptionKey: 'options.resx.include_schema_desc',
    },
    {
      type: 'boolean',
      key: 'sortKeys',
      labelKey: 'options.resx.sort_keys',
      descriptionKey: 'options.resx.sort_keys_desc',
    },
  ],
  convert({ data }, opts) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return {
        ok: false,
        error:
          'RESX requires a flat object of `{ "Key": "value" }` entries. Wrap arrays in an object first.',
      };
    }

    const entries: ResxEntry[] = [];

    for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
      if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        entries.push({ key, value: String(raw) });
        continue;
      }
      if (raw === null || raw === undefined) {
        entries.push({ key, value: '' });
        continue;
      }
      if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
        // { "value": "...", "_comment": "..." } shape
        const obj = raw as Record<string, unknown>;
        const inner = obj.value;
        if (inner !== null && inner !== undefined && typeof inner === 'object') {
          return {
            ok: false,
            error: `Key "${key}" has a nested "value". RESX entries must be plain text.`,
          };
        }
        const commentRaw = obj[opts.commentKey];
        const comment =
          typeof commentRaw === 'string' || typeof commentRaw === 'number'
            ? String(commentRaw)
            : undefined;
        entries.push({
          key,
          value: inner === null || inner === undefined ? '' : String(inner),
          ...(comment !== undefined ? { comment } : {}),
        });
        continue;
      }
      return {
        ok: false,
        error: `Key "${key}" has a nested value. RESX requires flat string entries. Flatten nested objects or use the { value, _comment } shape.`,
      };
    }

    if (opts.sortKeys) {
      // Ordinal order keeps diffs identical on every machine (localeCompare
      // depends on the user's locale).
      entries.sort((a, b) => compareOrdinal(a.key, b.key));
    }

    return { ok: true, output: buildResx(entries, opts) };
  },
  reverse({ text }, opts) {
    // RESX never declares a DOCTYPE; refusing one rules out entity-expansion
    // ("billion laughs") documents before the parser sees them.
    if (/<!DOCTYPE/i.test(text)) {
      return { ok: false, error: 'Not a RESX file: DOCTYPE declarations are not supported.' };
    }
    const validation = XMLValidator.validate(text);
    if (validation !== true) {
      return {
        ok: false,
        error: `Not well-formed XML: ${validation.err.msg} (line ${validation.err.line}, column ${validation.err.col}).`,
      };
    }
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        // Resource strings are text: "007", "1.10" or "  padded  " must come
        // back exactly as written (the file declares xml:space="preserve").
        parseTagValue: false,
        parseAttributeValue: false,
        trimValues: false,
        // Decodes numeric character references such as &#xD; (CR) that the
        // writer uses to keep CRLF line endings intact.
        htmlEntities: true,
      });
      const xml = parser.parse(text) as { root?: unknown };
      if (xml.root === undefined) {
        return { ok: false, error: 'Not a RESX file: the document has no <root> element.' };
      }
      const root = (typeof xml.root === 'object' && xml.root !== null ? xml.root : {}) as {
        data?: ResxDataEntry | ResxDataEntry[];
      };
      const dataEntries = root.data;
      const entries =
        dataEntries === undefined ? [] : Array.isArray(dataEntries) ? dataEntries : [dataEntries];
      const out: Record<string, unknown> = {};
      for (const e of entries) {
        const key = e['@_name'];
        if (typeof key !== 'string') continue;
        const value = textOf(e.value);
        const comment = textOf(e.comment);
        if (comment !== '') {
          const entry: Record<string, unknown> = {};
          defineOwn(entry, 'value', value);
          defineOwn(entry, opts.commentKey, comment);
          defineOwn(out, key, entry);
        } else {
          defineOwn(out, key, value);
        }
      }
      return { ok: true, output: JSON.stringify(out, null, 2) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};

interface ResxEntry {
  key: string;
  value: string;
  comment?: string;
}

interface ResxDataEntry {
  '@_name'?: string;
  value?: unknown;
  comment?: unknown;
}

/** Element text: a plain string, or the `#text` of an element that has attributes. */
function textOf(node: unknown): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'object') {
    const text = (node as Record<string, unknown>)['#text'];
    return text === undefined || text === null ? '' : String(text);
  }
  return String(node);
}

function buildResx(entries: ResxEntry[], opts: ResxOptions): string {
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="utf-8"?>');
  parts.push('<root>');
  if (opts.includeSchema) {
    parts.push(RESX_SCHEMA);
  }
  parts.push(RESX_RESHEADERS);
  for (const e of entries) {
    parts.push(`  <data name="${escapeAttr(e.key)}" xml:space="preserve">`);
    parts.push(`    <value>${escapeText(e.value)}</value>`);
    if (e.comment !== undefined) {
      parts.push(`    <comment>${escapeText(e.comment)}</comment>`);
    }
    parts.push('  </data>');
  }
  parts.push('</root>');
  return parts.join('\n') + '\n';
}

// Characters XML 1.0 can't carry at all (not even as references).
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function escapeText(s: string): string {
  return (
    s
      .replace(INVALID_XML_CHARS_RE, '\uFFFD')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // XML parsers normalize CR/CRLF to LF; encoding CR keeps CRLF text intact.
      .replace(/\r/g, '&#xD;')
  );
}

export function escapeAttr(s: string): string {
  return (
    s
      .replace(INVALID_XML_CHARS_RE, '\uFFFD')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      // Attribute-value normalization would turn these into spaces.
      .replace(/\t/g, '&#x9;')
      .replace(/\n/g, '&#xA;')
      .replace(/\r/g, '&#xD;')
  );
}

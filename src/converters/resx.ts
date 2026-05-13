import { XMLParser } from 'fast-xml-parser';
import type { Converter } from './types';

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
const RESX_SCHEMA_HEADER = `  <!--
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
  </xsd:schema>
  <resheader name="resmimetype">
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

    const entries: Array<{ key: string; value: string; comment?: string }> = [];

    for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
      if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        entries.push({ key, value: String(raw) });
        continue;
      }
      if (raw === null || raw === undefined) {
        entries.push({ key, value: '' });
        continue;
      }
      if (
        typeof raw === 'object' &&
        !Array.isArray(raw) &&
        'value' in raw &&
        typeof (raw as { value: unknown }).value !== 'object'
      ) {
        // { "value": "...", "_comment": "..." } shape
        const obj = raw as Record<string, unknown>;
        const value = String(obj.value ?? '');
        const commentRaw = obj[opts.commentKey];
        const comment =
          typeof commentRaw === 'string' || typeof commentRaw === 'number'
            ? String(commentRaw)
            : undefined;
        entries.push({ key, value, ...(comment !== undefined ? { comment } : {}) });
        continue;
      }
      return {
        ok: false,
        error: `Key "${key}" has a nested value. RESX requires flat string entries. Flatten nested objects or use the { value, _comment } shape.`,
      };
    }

    if (opts.sortKeys) {
      entries.sort((a, b) => a.key.localeCompare(b.key));
    }

    return { ok: true, output: buildResx(entries, opts) };
  },
  reverse({ text }, opts) {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      const xml = parser.parse(text) as {
        root?: { data?: ResxDataEntry | ResxDataEntry[] };
      };
      const dataEntries = xml.root?.data;
      if (!dataEntries) return { ok: true, output: '{}' };
      const entries = Array.isArray(dataEntries) ? dataEntries : [dataEntries];
      const out: Record<string, unknown> = {};
      for (const e of entries) {
        const key = e['@_name'];
        if (typeof key !== 'string') continue;
        const value = e.value ?? '';
        const comment = e.comment;
        if (comment !== undefined && comment !== '') {
          out[key] = { value: String(value), [opts.commentKey]: String(comment) };
        } else {
          out[key] = String(value);
        }
      }
      return { ok: true, output: JSON.stringify(out, null, 2) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

interface ResxDataEntry {
  '@_name'?: string;
  value?: unknown;
  comment?: unknown;
}

function buildResx(
  entries: Array<{ key: string; value: string; comment?: string }>,
  opts: ResxOptions,
): string {
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="utf-8"?>');
  parts.push('<root>');
  if (opts.includeSchema) {
    parts.push(RESX_SCHEMA_HEADER);
  }
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

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import { XMLBuilder, XMLValidator } from 'fast-xml-parser';
import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';
import { defineOwn } from '@/lib/json';

interface XmlOptions {
  /** Indentation width in spaces (0 = compact, no newlines). */
  indent: number;
  /** Tag name for the wrapping root element. */
  rootName: string;
  /** Tag name for array items when the array is at the root or nameless. */
  itemName: string;
  /** Emit `<?xml version="1.0" encoding="UTF-8"?>` declaration. */
  declaration: boolean;
}

const ATTR_PREFIX = '@_';
const TEXT_KEY = '#text';
/** Attribute that records the original JSON key when it isn't a valid XML name. */
const ORIGINAL_KEY_ATTR = 'key';

// XML 1.0 Name (simplified to the practical Unicode letter/number classes).
const XML_NAME_RE = /^[\p{L}_][\p{L}\p{N}._:-]*$/u;
// Characters XML 1.0 forbids even as character references.
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

function isXmlName(name: string): boolean {
  return XML_NAME_RE.test(name);
}

/** Turns an arbitrary JSON key into a valid XML element/attribute name. */
function toXmlName(key: string): string {
  if (isXmlName(key)) return key;
  let name = key.replace(/[^\p{L}\p{N}._:-]/gu, '_');
  if (!/^[\p{L}_]/u.test(name)) name = `_${name}`;
  return name;
}

function cleanText(value: string): string {
  return value.replace(INVALID_XML_CHARS_RE, '\uFFFD');
}

/**
 * Rewrites JSON into the shape fast-xml-parser's builder expects while keeping
 * the output well-formed:
 *  - invalid keys become valid names (original kept in a `key` attribute)
 *  - arrays nested directly in arrays get an `itemName` wrapper (the builder
 *    would otherwise emit `<0>` / `<1>` elements)
 *  - empty arrays become an empty element instead of vanishing
 *  - characters XML can't carry are replaced with U+FFFD
 */
function toXmlTree(value: unknown, itemName: string): unknown {
  if (typeof value === 'string') return cleanText(value);
  if (Array.isArray(value)) {
    return value.map((item) =>
      Array.isArray(item)
        ? { [itemName]: toXmlArrayValue(item, itemName) }
        : toXmlTree(item, itemName),
    );
  }
  if (value === null || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === TEXT_KEY) {
      defineOwn(out, key, typeof child === 'string' ? cleanText(child) : child);
      continue;
    }
    if (key.startsWith(ATTR_PREFIX)) {
      const attr = toXmlName(key.slice(ATTR_PREFIX.length) || '_');
      defineOwn(out, ATTR_PREFIX + attr, typeof child === 'string' ? cleanText(child) : child);
      continue;
    }
    const name = toXmlName(key);
    let converted = Array.isArray(child)
      ? toXmlArrayValue(child, itemName)
      : toXmlTree(child, itemName);
    if (name !== key && !Array.isArray(converted)) {
      converted = withOriginalKey(converted, key);
    }
    if (Object.hasOwn(out, name)) {
      // Two keys sanitized to the same name: merge into a repeated element.
      const existing = out[name];
      defineOwn(out, name, [...(Array.isArray(existing) ? existing : [existing]), converted]);
    } else {
      defineOwn(out, name, converted);
    }
  }
  return out;
}

function toXmlArrayValue(items: unknown[], itemName: string): unknown {
  // An empty array still produces an (empty) element so the key isn't lost.
  if (items.length === 0) return '';
  return toXmlTree(items, itemName);
}

function withOriginalKey(value: unknown, original: string): unknown {
  const attr = ATTR_PREFIX + ORIGINAL_KEY_ATTR;
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Object.hasOwn(obj, attr)) return obj;
    const out: Record<string, unknown> = {};
    defineOwn(out, attr, cleanText(original));
    for (const [k, v] of Object.entries(obj)) defineOwn(out, k, v);
    return out;
  }
  const out: Record<string, unknown> = {};
  defineOwn(out, attr, cleanText(original));
  defineOwn(out, TEXT_KEY, value);
  return out;
}

/**
 * Attribute convention: object keys starting with `@_` are emitted as
 * attributes on the parent element (fast-xml-parser default).
 * Example:
 *   `{ person: { "@_id": "1", name: "Alice" } }`
 *   → `<person id="1"><name>Alice</name></person>`
 */
export const xmlConverter: Converter<XmlOptions> = {
  meta: {
    id: 'xml',
    labelKey: 'formats.xml',
    extension: 'xml',
    mimeType: 'application/xml',
    phase: 2,
    ready: true,
  },
  defaultOptions: {
    indent: 2,
    rootName: 'root',
    itemName: 'item',
    declaration: true,
  },
  optionSchema: [
    {
      type: 'integer',
      key: 'indent',
      labelKey: 'options.xml.indent',
      min: 0,
      max: 8,
    },
    {
      type: 'string',
      key: 'rootName',
      labelKey: 'options.xml.root_name',
      placeholder: 'root',
    },
    {
      type: 'string',
      key: 'itemName',
      labelKey: 'options.xml.item_name',
      descriptionKey: 'options.xml.item_name_desc',
      placeholder: 'item',
    },
    {
      type: 'boolean',
      key: 'declaration',
      labelKey: 'options.xml.declaration',
      descriptionKey: 'options.xml.declaration_desc',
    },
  ],
  convert({ data }, opts) {
    const rootName = opts.rootName.trim() || 'root';
    const itemName = opts.itemName.trim() || 'item';
    if (!isXmlName(rootName)) {
      return { ok: false, error: `"${rootName}" is not a valid XML element name for the root.` };
    }
    if (!isXmlName(itemName)) {
      return { ok: false, error: `"${itemName}" is not a valid XML element name for items.` };
    }
    try {
      const indent = Math.min(8, Math.max(0, Math.trunc(Number(opts.indent)) || 0));
      const body = Array.isArray(data)
        ? { [itemName]: toXmlArrayValue(data, itemName) }
        : toXmlTree(data, itemName);
      const builder = new XMLBuilder({
        format: indent > 0,
        indentBy: ' '.repeat(indent),
        ignoreAttributes: false,
        attributeNamePrefix: ATTR_PREFIX,
        textNodeName: TEXT_KEY,
        suppressEmptyNode: false,
        // `{"@_enabled": true}` must become enabled="true", not a bare attribute.
        suppressBooleanAttributes: false,
      });
      const xml = builder.build({ [rootName]: body }) as string;
      const validation = XMLValidator.validate(xml);
      if (validation !== true) {
        return {
          ok: false,
          error: `Could not build well-formed XML (${validation.err.msg}, line ${validation.err.line}).`,
        };
      }
      const decl = opts.declaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
      // fast-xml-parser sometimes omits trailing newline; normalize.
      return { ok: true, output: decl + (xml.endsWith('\n') ? xml : xml + '\n') };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};

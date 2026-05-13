import { XMLBuilder } from 'fast-xml-parser';
import type { Converter } from './types';

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
    try {
      const wrapped = wrapForXml(data, opts.rootName, opts.itemName);
      const builder = new XMLBuilder({
        format: opts.indent > 0,
        indentBy: ' '.repeat(opts.indent),
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        suppressEmptyNode: false,
      });
      const xml = builder.build(wrapped) as string;
      const decl = opts.declaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
      // fast-xml-parser sometimes omits trailing newline; normalize.
      const body = xml.endsWith('\n') ? xml : xml + '\n';
      return { ok: true, output: decl + body };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};

function wrapForXml(data: unknown, rootName: string, itemName: string): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { [rootName]: { [itemName]: data } };
  }
  if (data === null || typeof data !== 'object') {
    return { [rootName]: data };
  }
  return { [rootName]: data };
}

import type { EditorLanguage } from '@/components/converter/CodeEditor';
import type { Direction, FormatId } from '@/converters/types';

/** Closest CodeMirror language pack for text in a given format. */
function languageOfFormat(format: FormatId): EditorLanguage {
  switch (format) {
    case 'yaml':
      return 'yaml';
    case 'xml':
    case 'resx':
      return 'xml';
    case 'jsonl':
      return 'json';
    case 'markdown':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'toml':
      return 'toml';
    default:
      // CSV/TSV and the base64/hex text of binary formats have no grammar.
      return 'plain';
  }
}

/** Language for the input editor: JSON going forward, the format's own going back. */
export function editorLanguageFor(format: FormatId, direction: Direction): EditorLanguage {
  return direction === 'reverse' ? languageOfFormat(format) : 'json';
}

/** Language for the read-only output editor. */
export function outputLanguageFor(format: FormatId, direction: Direction): EditorLanguage {
  return direction === 'reverse' ? 'json' : languageOfFormat(format);
}

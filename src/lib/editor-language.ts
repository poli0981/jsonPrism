import type { EditorLanguage } from '@/components/converter/CodeEditor';
import type { Direction } from '@/components/converter/DirectionToggle';
import type { FormatId } from '@/converters/types';

// CodeMirror language pack for the input editor. Forward mode is always JSON.
// In reverse mode, pick the closest available pack — formats without an
// official CodeMirror grammar fall back to plain text.
export function editorLanguageFor(format: FormatId, direction: Direction): EditorLanguage {
  if (direction !== 'reverse') return 'json';
  if (format === 'yaml') return 'yaml';
  if (format === 'xml' || format === 'resx') return 'xml';
  if (format === 'jsonl') return 'json';
  if (format === 'markdown') return 'markdown';
  if (format === 'sql') return 'sql';
  if (format === 'toml') return 'toml';
  return 'plain';
}

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import type { FormatId } from '@/converters/types';
import { FormatPicker } from '../FormatPicker';

const LABELS: Record<FormatId, string> = {
  jsonl: 'JSONL',
  jsonc: 'JSONC',
  csv: 'CSV',
  tsv: 'TSV',
  yaml: 'YAML',
  xml: 'XML',
  toml: 'TOML',
  resx: 'RESX',
  markdown: 'Markdown table',
  sql: 'SQL INSERT',
  bson: 'BSON',
  cbor: 'CBOR',
  msgpack: 'MessagePack',
};

/** The always-visible chip row (the mobile sheet is closed). */
function inlineGroup() {
  return screen.getByRole('group', { name: 'Target format' });
}

function chip(format: FormatId, container: HTMLElement = inlineGroup()) {
  return within(container).getByRole('button', { name: LABELS[format] });
}

describe('FormatPicker — inline chips', () => {
  it('offers every format as a toggle button and marks the active one', () => {
    render(<FormatPicker value="yaml" onChange={() => {}} />);
    const buttons = within(inlineGroup()).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(Object.values(LABELS));
    for (const button of buttons.filter((b) => b.textContent !== 'JSONC')) {
      expect(button).toHaveAttribute(
        'aria-pressed',
        button.textContent === 'YAML' ? 'true' : 'false',
      );
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('title', 'Ready');
    }
  });

  it('disables input-only formats going forward', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatPicker value="jsonl" onChange={onChange} shape="object" />);

    expect(chip('jsonc')).toBeDisabled();
    expect(chip('jsonc')).toHaveAttribute(
      'title',
      'Input only: converts to JSON in the → JSON direction',
    );
    // Disabled, not "not suggested": no dashed border.
    expect(chip('jsonc')).not.toHaveClass('border-dashed');

    await user.click(chip('jsonc'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the picked format', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatPicker value="jsonl" onChange={onChange} />);
    await user.click(chip('toml'));
    expect(onChange).toHaveBeenCalledWith('toml');
  });

  it('flags which formats suit the detected shape', () => {
    render(<FormatPicker value="jsonl" onChange={() => {}} shape="array-of-objects" />);
    expect(chip('csv')).toHaveAttribute('title', 'Suggested for the detected shape');
    expect(chip('sql')).toHaveAttribute('title', 'Suggested for the detected shape');
    expect(chip('toml')).toHaveAttribute('title', 'Not suggested for the detected shape');
    expect(chip('resx')).toHaveAttribute('title', 'Not suggested for the detected shape');
    // Unsuitable formats stay usable.
    expect(chip('toml')).toBeEnabled();
  });

  it('ignores the shape when converting back to JSON', () => {
    render(
      <FormatPicker
        value="yaml"
        onChange={() => {}}
        shape="array-of-objects"
        direction="reverse"
      />,
    );
    expect(chip('csv')).toHaveAttribute('title', 'Ready');
    expect(chip('toml')).toHaveAttribute('title', 'Ready');
  });

  it('disables formats that cannot be parsed back in reverse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatPicker value="csv" onChange={onChange} direction="reverse" />);

    for (const format of ['xml', 'markdown', 'sql', 'bson', 'cbor', 'msgpack'] as const) {
      expect(chip(format)).toBeDisabled();
      expect(chip(format)).toHaveAttribute('title', 'Reverse parse not supported for this format');
    }
    for (const format of ['jsonl', 'jsonc', 'csv', 'tsv', 'yaml', 'toml', 'resx'] as const) {
      expect(chip(format)).toBeEnabled();
      expect(chip(format)).toHaveAttribute('title', 'Ready');
    }

    await user.click(chip('xml'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('FormatPicker — compact sheet (mobile)', () => {
  it('shows the current format on the trigger', () => {
    render(<FormatPicker value="markdown" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Target format\s*Markdown table/ })).toBeVisible();
  });

  it('opens a sheet of chips and closes it after a pick', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatPicker value="jsonl" onChange={onChange} shape="object" />);

    await user.click(screen.getByRole('button', { name: /Target format\s*JSONL/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Target format' });
    const sheetGroup = within(dialog).getByRole('group', { name: 'Target format' });
    expect(within(sheetGroup).getAllByRole('button')).toHaveLength(13);
    expect(chip('jsonl', sheetGroup)).toHaveAttribute('aria-pressed', 'true');
    expect(chip('yaml', sheetGroup)).toHaveAttribute('title', 'Suggested for the detected shape');

    await user.click(chip('yaml', sheetGroup));
    expect(onChange).toHaveBeenCalledWith('yaml');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('can be dismissed without picking', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormatPicker value="jsonl" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Target format\s*JSONL/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });
});

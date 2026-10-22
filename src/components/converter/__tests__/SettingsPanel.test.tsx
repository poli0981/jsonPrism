import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import type * as RegistryModule from '@/converters/registry';
import type { FormatId, OptionSchemaField } from '@/converters/types';
import { SettingsPanel } from '../SettingsPanel';

// Lets a test swap in an option schema no shipped converter has (none, or an
// unbounded integer) to pin down how the panel handles it.
const overrides = vi.hoisted(() => ({
  schema: null as ReadonlyArray<OptionSchemaField<Record<string, unknown>>> | null,
}));
vi.mock('@/converters/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof RegistryModule>();
  return {
    ...actual,
    getConverter: (id: FormatId) => {
      const converter = actual.getConverter(id);
      return overrides.schema ? { ...converter, optionSchema: overrides.schema } : converter;
    },
  };
});

beforeEach(() => {
  overrides.schema = null;
});

interface HarnessProps {
  format: FormatId;
  initialOptions: Record<string, unknown>;
  initiallyOpen?: boolean;
  onChange?: (next: Record<string, unknown>) => void;
  onReset?: () => void;
}

/** Owns `options` and `open` the way ConverterWorkspace does. */
function Harness({
  format,
  initialOptions,
  initiallyOpen = true,
  onChange = () => {},
  onReset = () => {},
}: HarnessProps) {
  const [options, setOptions] = useState(initialOptions);
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <SettingsPanel
      format={format}
      options={options}
      onChange={(next) => {
        onChange(next);
        setOptions(next);
      }}
      onReset={onReset}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

const CSV_OPTIONS = {
  delimiter: ',',
  header: true,
  newline: '\n',
  nestedStrategy: 'json',
  escapeFormulae: false,
};

describe('SettingsPanel — sheet', () => {
  it('opens from the Options button and closes again', async () => {
    const user = userEvent.setup();
    render(<Harness format="csv" initialOptions={CSV_OPTIONS} initiallyOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Options' }));
    const dialog = await screen.findByRole('dialog', { name: 'CSV · Options' });
    expect(dialog).toHaveAccessibleDescription(
      'Adjust how this format is generated. Settings persist per format.',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('resets through the footer button', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<Harness format="csv" initialOptions={CSV_OPTIONS} onReset={onReset} />);
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('explains when a format has no options', () => {
    overrides.schema = [];
    render(<Harness format="jsonl" initialOptions={{}} />);
    const dialog = screen.getByRole('dialog', { name: 'JSONL · Options' });
    expect(dialog).toHaveAccessibleDescription('No options for this format yet.');
    expect(within(dialog).getByText("This converter doesn't have any options.")).toBeVisible();
    expect(
      within(dialog).queryByRole('button', { name: 'Reset to defaults' }),
    ).not.toBeInTheDocument();
  });
});

describe('SettingsPanel — boolean fields', () => {
  it('renders a described switch that merges its value into the options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness format="csv" initialOptions={CSV_OPTIONS} onChange={onChange} />);

    const header = screen.getByRole('switch', { name: 'Include header row' });
    expect(header).toBeChecked();
    expect(header).toHaveAccessibleDescription(
      'Emit the first row as column names derived from object keys.',
    );

    await user.click(header);
    expect(onChange).toHaveBeenLastCalledWith({ ...CSV_OPTIONS, header: false });
    expect(header).not.toBeChecked();

    const formulae = screen.getByRole('switch', { name: 'Protect against formula injection' });
    expect(formulae).not.toBeChecked();
    await user.click(formulae);
    expect(onChange).toHaveBeenLastCalledWith({
      ...CSV_OPTIONS,
      header: false,
      escapeFormulae: true,
    });
  });
});

describe('SettingsPanel — enum fields', () => {
  it('renders a group of toggle buttons with the current choice pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness format="csv" initialOptions={CSV_OPTIONS} onChange={onChange} />);

    const newline = screen.getByRole('group', { name: 'Newline' });
    const lf = within(newline).getByRole('button', { name: 'LF (\\n)' });
    const crlf = within(newline).getByRole('button', { name: 'CRLF (\\r\\n)' });
    expect(lf).toHaveAttribute('aria-pressed', 'true');
    expect(crlf).toHaveAttribute('aria-pressed', 'false');

    await user.click(crlf);
    expect(onChange).toHaveBeenLastCalledWith({ ...CSV_OPTIONS, newline: '\r\n' });
    expect(lf).toHaveAttribute('aria-pressed', 'false');
    expect(crlf).toHaveAttribute('aria-pressed', 'true');
  });

  it('links the description of a described choice', () => {
    render(<Harness format="csv" initialOptions={CSV_OPTIONS} />);
    expect(screen.getByRole('group', { name: 'Nested values' })).toHaveAccessibleDescription(
      'How to handle nested objects/arrays inside cells.',
    );
    expect(screen.getByRole('group', { name: 'Newline' })).not.toHaveAttribute('aria-describedby');
  });

  it('presses the stored choice rather than the default', () => {
    render(<Harness format="markdown" initialOptions={{ alignment: 'center' }} />);
    const group = screen.getByRole('group', { name: 'Column alignment' });
    expect(within(group).getByRole('button', { name: 'Center' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: 'Left' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('SettingsPanel — integer fields', () => {
  it('falls back to the minimum when no value is stored', () => {
    render(<Harness format="yaml" initialOptions={{}} />);
    expect(screen.getByRole('spinbutton', { name: 'Indent (spaces)' })).toHaveValue(2);
  });

  it('commits in-range integers while typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness format="yaml" initialOptions={{ indent: 2 }} onChange={onChange} />);
    const indent = screen.getByRole('spinbutton', { name: 'Indent (spaces)' });
    expect(indent).toHaveAttribute('min', '2');
    expect(indent).toHaveAttribute('max', '8');

    await user.clear(indent);
    // An empty field is a draft, not a value.
    expect(onChange).not.toHaveBeenCalled();
    await user.type(indent, '4');
    expect(onChange).toHaveBeenLastCalledWith({ indent: 4 });
    expect(indent).toHaveValue(4);
  });

  it('clamps out-of-range values when the field loses focus', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness format="yaml" initialOptions={{ indent: 2 }} onChange={onChange} />);
    const indent = screen.getByRole('spinbutton', { name: 'Indent (spaces)' });

    await user.clear(indent);
    await user.type(indent, '12');
    // "1" and "12" are both outside 2..8, so nothing is committed yet.
    expect(onChange).not.toHaveBeenCalled();
    expect(indent).toHaveValue(12);

    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({ indent: 8 });
    expect(indent).toHaveValue(8);

    await user.clear(indent);
    await user.type(indent, '1');
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({ indent: 2 });
    expect(indent).toHaveValue(2);
  });

  it('restores the committed value when left empty', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness format="sql" initialOptions={{ chunkSize: 100 }} onChange={onChange} />);
    const chunk = screen.getByRole('spinbutton', { name: 'Chunk size' });
    expect(chunk).toHaveAccessibleDescription('Maximum rows per INSERT when multi-row is on.');

    await user.clear(chunk);
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(chunk).toHaveValue(100);
  });

  it('treats an integer without bounds as open-ended, starting at 0', async () => {
    overrides.schema = [{ type: 'integer', key: 'offset', labelKey: 'options.sql.chunk_size' }];
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness format="sql" initialOptions={{}} onChange={onChange} />);
    const offset = screen.getByRole('spinbutton', { name: 'Chunk size' });
    expect(offset).toHaveValue(0);
    expect(offset).not.toHaveAttribute('min');
    expect(offset).not.toHaveAttribute('max');

    await user.clear(offset);
    await user.type(offset, '-40');
    expect(onChange).toHaveBeenLastCalledWith({ offset: -40 });

    await user.clear(offset);
    await user.type(offset, '250000');
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith({ offset: 250000 });
    expect(offset).toHaveValue(250000);
  });

  it('does not carry a half-typed value over to another format', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SettingsPanel
        format="yaml"
        options={{ indent: 2 }}
        onChange={() => {}}
        onReset={() => {}}
        open
        onOpenChange={() => {}}
      />,
    );
    const yamlIndent = screen.getByRole('spinbutton', { name: 'Indent (spaces)' });
    await user.clear(yamlIndent);
    await user.type(yamlIndent, '9');
    expect(yamlIndent).toHaveValue(9);

    rerender(
      <SettingsPanel
        format="xml"
        options={{ indent: 4, rootName: 'root', itemName: 'item', declaration: true }}
        onChange={() => {}}
        onReset={() => {}}
        open
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByRole('spinbutton', { name: 'Indent (spaces)' })).toHaveValue(4);
  });
});

describe('SettingsPanel — string fields', () => {
  it('edits text options with a placeholder and length cap', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const xml = { indent: 2, rootName: 'root', itemName: 'item', declaration: true };
    render(<Harness format="xml" initialOptions={xml} onChange={onChange} />);

    const rootName = screen.getByRole('textbox', { name: 'Root element name' });
    expect(rootName).toHaveValue('root');
    expect(rootName).toHaveAttribute('placeholder', 'root');
    expect(rootName).toHaveAttribute('maxLength', '200');

    await user.clear(rootName);
    await user.type(rootName, 'games');
    expect(onChange).toHaveBeenLastCalledWith({ ...xml, rootName: 'games' });
    expect(rootName).toHaveValue('games');

    expect(
      screen.getByRole('textbox', { name: 'Array item element name' }),
    ).toHaveAccessibleDescription(
      'Used for items when the root is an array. Object keys name their own array items.',
    );
  });

  it('shows an empty box for a missing text value', () => {
    render(<Harness format="sql" initialOptions={{}} />);
    const table = screen.getByRole('textbox', { name: 'Table name' });
    expect(table).toHaveValue('');
    expect(table).toHaveAttribute('placeholder', 'records');
  });
});

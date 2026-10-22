import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import { useBatchStore, type BatchItem } from '@/stores/batchStore';
import { BatchItemRow } from '../BatchItemRow';

function queue(name: string, bytes: number): string {
  useBatchStore.getState().addFiles([new File(['x'.repeat(bytes)], name)]);
  const { itemOrder } = useBatchStore.getState();
  return itemOrder[itemOrder.length - 1]!;
}

function update(id: string, patch: Partial<BatchItem>): void {
  act(() => useBatchStore.getState().updateItem(id, patch));
}

function renderRow(id: string, { disabled = false, outputExt = 'csv' } = {}) {
  const onRemove = vi.fn<(id: string) => void>();
  const view = render(
    <ul>
      <BatchItemRow id={id} outputExt={outputExt} onRemove={onRemove} disabled={disabled} />
    </ul>,
  );
  return { ...view, onRemove };
}

beforeEach(() => {
  useBatchStore.getState().clear();
});

describe('BatchItemRow', () => {
  it('renders nothing for an id that is not in the queue', () => {
    const { container } = renderRow('missing');
    expect(container.querySelector('li')).toBeNull();
  });

  it('shows a queued file with its size and target extension', () => {
    const id = queue('data.json', 2048);
    renderRow(id);

    expect(screen.getByText('data.json')).toBeInTheDocument();
    expect(screen.getByText('→ .csv')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('queued')).toHaveClass('sr-only');
    expect(screen.queryByText(/^out:/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove data.json from queue' })).toBeEnabled();
  });

  it('shows a spinner while the file is processing', () => {
    const id = queue('data.json', 10);
    const { container } = renderRow(id);

    update(id, { status: 'processing' });

    expect(screen.getByText('processing')).toHaveClass('sr-only');
    expect(container.querySelector('svg.motion-safe\\:animate-spin')).not.toBeNull();
  });

  it('shows the output size once the file is converted', () => {
    const id = queue('data.json', 10);
    renderRow(id);

    update(id, { status: 'done', output: 'a,b\n', outputSize: 1536 });

    expect(screen.getByText('done')).toHaveClass('sr-only');
    expect(screen.getByText('out: 1.5 KB')).toBeInTheDocument();
  });

  it('translates known error codes', () => {
    const id = queue('empty.json', 0);
    renderRow(id);

    update(id, { status: 'error', error: 'Empty file.', errorCode: 'empty_file' });

    expect(screen.getByText('failed')).toHaveClass('sr-only');
    expect(screen.getByText('The file is empty.')).toBeInTheDocument();
    expect(screen.queryByText('Empty file.')).not.toBeInTheDocument();
  });

  it("shows the converter's own message for other errors", () => {
    const id = queue('broken.json', 5);
    renderRow(id);

    update(id, { status: 'error', error: 'Unexpected end of JSON input' });

    expect(screen.getByText('Unexpected end of JSON input')).toHaveClass('text-destructive');
  });

  it('removes the row through onRemove', async () => {
    const id = queue('data.json', 10);
    const { onRemove } = renderRow(id);

    await userEvent.click(screen.getByRole('button', { name: 'Remove data.json from queue' }));

    expect(onRemove).toHaveBeenCalledWith(id);
  });

  it('cannot be removed while the batch is processing', async () => {
    const id = queue('data.json', 10);
    const { onRemove } = renderRow(id, { disabled: true });

    const remove = screen.getByRole('button', { name: 'Remove data.json from queue' });
    expect(remove).toBeDisabled();
    await userEvent.click(remove);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('disappears when its item leaves the queue', () => {
    const id = queue('data.json', 10);
    const { container } = renderRow(id, { outputExt: 'json' });
    expect(screen.getByText('→ .json')).toBeInTheDocument();

    act(() => useBatchStore.getState().removeItem(id));

    expect(container.querySelector('li')).toBeNull();
  });
});

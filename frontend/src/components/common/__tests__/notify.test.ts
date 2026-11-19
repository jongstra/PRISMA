import { describe, it, expect, vi } from 'vitest';
import Swal from 'sweetalert2';
import { notifySuccess, notifyUndoable } from '../notify';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(), stopTimer: vi.fn(), resumeTimer: vi.fn() } }));

describe('notifySuccess', () => {
  it('shows a short message at the top right that closes by itself after 3 seconds', () => {
    notifySuccess('DeTT&CT file loaded');
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        toast: true,
        position: 'top-end',
        icon: 'success',
        titleText: 'DeTT&CT file loaded',
        showConfirmButton: false,
        timer: 3000,
      }),
    );
  });

  it('can show a message with an Undo button that names the shortcut, and undoes when it is clicked', async () => {
    const undo = vi.fn();
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: false } as Awaited<ReturnType<typeof Swal.fire>>);
    await notifyUndoable('Deleted DOS-1-2.', '1 use case lost its parent: DOS-1-2-1.', undo, '⌘Z');
    expect(Swal.fire).toHaveBeenLastCalledWith(
      expect.objectContaining({
        toast: true,
        titleText: 'Deleted DOS-1-2.',
        text: '1 use case lost its parent: DOS-1-2-1.',
        showConfirmButton: true,
        confirmButtonText: 'Undo (⌘Z)',
        timer: 5000,
      }),
    );
    expect(undo).not.toHaveBeenCalled();
    vi.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: true } as Awaited<ReturnType<typeof Swal.fire>>);
    await notifyUndoable('Deleted DOS-1-2.', undefined, undo, '⌘Z');
    expect(undo).toHaveBeenCalledOnce();
  });
});

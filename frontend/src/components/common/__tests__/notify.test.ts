import { describe, it, expect, vi } from 'vitest';
import Swal from 'sweetalert2';
import { notifySuccess } from '../notify';

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
});

// A short message at the top right for an action that went well, such as loading a file. It closes by itself after a few
// seconds, and stays while the mouse is on it. Warnings and errors use a dialog instead, because they need reading.
import Swal from 'sweetalert2';

export function notifySuccess(text: string) {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    titleText: text,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });
}

/**
 * A short message for a change that can be undone, such as deleting a use case, with an Undo button that also names its
 * shortcut (such as ⌘Z). It stays 5 seconds, so there is time to click the button; the detail is a second line, such as
 * what else the change affected.
 */
export async function notifyUndoable(text: string, detail: string | undefined, undo: () => void, shortcut: string) {
  const result = await Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    titleText: text,
    text: detail,
    showConfirmButton: true,
    confirmButtonText: `Undo (${shortcut})`,
    confirmButtonColor: 'var(--color-accent)',
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });
  if (result.isConfirmed) {
    undo();
  }
}

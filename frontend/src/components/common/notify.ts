// A short message at the top right for an action that went well, such as loading a file. It closes by itself after 3
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

// Where the list of TechniquePicker.vue (the technique field of the L3 sheet) goes.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const WIDTH = 420; // of the list, wider than the table column so the names fit
const MAX_HEIGHT = 300; // the rest of the list scrolls
const ENOUGH_ROOM = 200; // below the field, to open the list there even when there is more room above
const MARGIN = 8; // room kept free at the edges of the window

/**
 * Where the list goes, in window coordinates: below the field, or above it when the field is near the bottom of the
 * window. It is shown in the page body, so the scrolling MaGMa table does not cut it off.
 */
export function listPlacement(field: Box, listHeight: number, window: { width: number; height: number }) {
  const roomBelow = window.height - MARGIN - (field.top + field.height);
  const roomAbove = field.top - MARGIN;
  const below = roomBelow >= Math.min(listHeight, ENOUGH_ROOM) || roomBelow >= roomAbove;
  const maxHeight = Math.min(MAX_HEIGHT, below ? roomBelow : roomAbove);
  return {
    left: Math.max(MARGIN, Math.min(field.left, window.width - MARGIN - WIDTH)),
    top: below ? field.top + field.height : field.top - Math.min(listHeight, maxHeight),
    width: WIDTH,
    maxHeight,
  };
}

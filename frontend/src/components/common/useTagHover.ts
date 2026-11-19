// Hovering a group or data component in a pinned technique tooltip (the DeTT&CT matrix or the MaGMa heatmap) marks it as
// hovered in the catalog, so the matrix rings the other techniques it uses. One listener for the whole page ends the
// mark when the mouse moves off the tags; that also works when the tooltip closes under the mouse (no mouseleave then).
import { onMounted, onUnmounted } from 'vue';

interface Hoverable {
  name: string;
  hovered?: boolean;
}

/** Marks the group or data component with this name as hovered. */
export function hoverTag(items: Hoverable[], name: string) {
  items.forEach((item) => {
    if (item.name === name) {
      item.hovered = true;
    }
  });
}

/** Ends the hover marks of the domain's groups and data components when the mouse is no longer on such a tag. */
export function useEndTagHover(domain: () => { groups: Hoverable[]; data_components: Hoverable[] } | undefined) {
  const end = (items: Hoverable[]) =>
    items.forEach((item) => {
      if (item.hovered) {
        delete item.hovered;
      }
    });
  const onMousemove = (event: MouseEvent) => {
    const target = event.target as Element;
    const current = domain();
    if (!current) {
      return;
    }
    if (!target.closest?.('.group-box')) {
      end(current.groups);
    }
    if (!target.closest?.('.component-box')) {
      end(current.data_components);
    }
  };
  onMounted(() => document.addEventListener('mousemove', onMousemove));
  onUnmounted(() => document.removeEventListener('mousemove', onMousemove));
}

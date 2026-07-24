// CSS classes shared between the draggable composables
// SortableJS draws the drag affordances itself and only needs the class names

export const ITEM_CLASS = 'draggable-item';
export const HANDLE_CLASS = 'draggable-handle';
export const DISABLED_CLASS = 'draggable-item--disabled';
// The clone that follows the pointer (SortableJS fallbackClass).
export const MIRROR_CLASS = 'draggable-item--mirror';
// The placeholder left in the list showing where the item will land (ghostClass).
export const GHOST_CLASS = 'draggable-item--ghost';
// The item being dragged, still in its source list (chosenClass).
export const CHOSEN_CLASS = 'draggable-item--chosen';
// The copy under the cursor in native-drag mode (dragClass).
export const DRAG_CLASS = 'draggable-item--drag';
// Hand-rolled drop "bounce"; SortableJS has no equivalent.
export const PLACED_CLASS = 'draggable-item--placed';

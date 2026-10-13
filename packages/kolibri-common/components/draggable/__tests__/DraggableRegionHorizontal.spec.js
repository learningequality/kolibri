import { render, screen } from '@testing-library/vue';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import DraggableRegion from '../DraggableRegion.vue';
import DraggableItem from '../DraggableItem.vue';
import DraggableHandle from '../DraggableHandle.vue';
import { ITEM_CLASS, MIRROR_CLASS } from '../classDefinitions';

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

// Real SortableJS decides where a dragged item lands from element rects and the
// pointer position. jsdom has no layout, so these tests lay the list out as a
// single row of fixed-size slots, in DOM order for LTR and reversed for RTL.
const SLOT_WIDTH = 100;
const SLOT_HEIGHT = 40;
// one slot wider than its three items, so there is empty space after the last item,
// as at the end of a wrapped row
const ROW_WIDTH = 4 * SLOT_WIDTH;

const RowList = {
  name: 'RowList',
  components: { DraggableRegion, DraggableItem, DraggableHandle },
  props: {
    direction: {
      type: String,
      required: true,
    },
  },
  data() {
    return { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  },
  template: `
    <DraggableRegion :items="items" @update:items="items = $event">
      <ul :style="{ display: 'flex', direction }">
        <DraggableItem v-for="item in items" :key="item.id">
          <li><DraggableHandle><span>{{ item.id }}</span></DraggableHandle></li>
        </DraggableItem>
      </ul>
    </DraggableRegion>
  `,
};

// The items SortableJS sees as list slots: not the mirror following the pointer,
// and not a hidden clone.
function slotsOf(list) {
  return [...list.children].filter(
    child =>
      child.classList.contains(ITEM_CLASS) &&
      !child.classList.contains(MIRROR_CLASS) &&
      child.style.display !== 'none',
  );
}

function rectAt(left) {
  return {
    left,
    right: left + SLOT_WIDTH,
    top: 0,
    bottom: SLOT_HEIGHT,
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    x: left,
    y: 0,
  };
}

function layOutRow(list, direction) {
  jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const slots = slotsOf(list);
    if (this === list) {
      return { ...rectAt(0), right: ROW_WIDTH, width: ROW_WIDTH };
    }
    const index = slots.indexOf(this.closest(`.${ITEM_CLASS}`));
    if (index === -1) {
      return rectAt(-1000);
    }
    // an RTL row starts at the right
    return rectAt(direction === 'rtl' ? ROW_WIDTH - (index + 1) * SLOT_WIDTH : index * SLOT_WIDTH);
  });
  const contains = (el, x, y) => {
    const { left, right, top, bottom } = el.getBoundingClientRect();
    return x >= left && x < right && y >= top && y < bottom;
  };
  document.elementFromPoint = (x, y) =>
    slotsOf(list).find(slot => contains(slot, x, y)) ||
    (contains(list, x, y) ? list : document.body);
}

function centreOf(el) {
  const { left, top } = el.getBoundingClientRect();
  return { clientX: left + SLOT_WIDTH / 2, clientY: top + SLOT_HEIGHT / 2 };
}

// jsdom has no PointerEvent, so SortableJS listens for mouse events instead
function mouse(type, target, coords) {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...coords }),
  );
}

// Press on an item's handle, move the pointer to `point`, and release there.
function dragTo(label, point) {
  const handle = screen.getByText(label);
  const from = centreOf(handle);
  mouse('mousedown', handle, from);
  // the first move starts the drag; SortableJS shows its mirror on the next tick
  mouse('mousemove', document, { clientX: from.clientX + 1, clientY: from.clientY });
  jest.advanceTimersByTime(0);
  mouse('mousemove', document, point);
  // SortableJS checks what is under the pointer every 50ms
  jest.advanceTimersByTime(50);
  mouse('mouseup', document, point);
}

function offsetFromCentre(label, offset) {
  const centre = centreOf(screen.getByText(label));
  return { ...centre, clientX: centre.clientX + offset };
}

// Drag one item onto another, releasing past its middle as a person would.
function drag(label, ontoLabel) {
  const travel = Math.sign(
    centreOf(screen.getByText(ontoLabel)).clientX - centreOf(screen.getByText(label)).clientX,
  );
  dragTo(label, offsetFromCentre(ontoLabel, (travel * SLOT_WIDTH) / 4));
}

function renderedOrder() {
  return screen.getAllByRole('listitem').map(item => item.textContent.trim());
}

describe('DraggableRegion in a horizontal row', () => {
  // jsdom has neither, so they are assigned rather than spied on
  const { elementFromPoint } = document;
  const { matchMedia } = window;

  beforeEach(() => {
    jest.useFakeTimers();
    useKLiveRegion.mockReturnValue({ sendPoliteMessage: jest.fn() });
    // no drop animation, so SortableJS never skips a move while an item animates
    window.matchMedia = jest.fn(() => ({ matches: true }));
  });

  afterEach(() => {
    // SortableJS keeps module-level drag state that it resets on timers; flush
    // them so one test's drag does not leak into the next
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    document.elementFromPoint = elementFromPoint;
    window.matchMedia = matchMedia;
  });

  function renderRow(direction) {
    const { container } = render(RowList, { props: { direction } });
    layOutRow(container.querySelector('ul'), direction);
  }

  describe.each(['ltr', 'rtl'])('%s', direction => {
    it('moves the first item one slot toward the end', async () => {
      renderRow(direction);
      drag('a', 'b');
      await Promise.resolve();
      expect(renderedOrder()).toEqual(['b', 'a', 'c']);
    });

    it('moves the middle item one slot toward the start', async () => {
      renderRow(direction);
      drag('b', 'a');
      await Promise.resolve();
      expect(renderedOrder()).toEqual(['b', 'a', 'c']);
    });

    it('moves the first item to the end', async () => {
      renderRow(direction);
      drag('a', 'c');
      await Promise.resolve();
      expect(renderedOrder()).toEqual(['b', 'c', 'a']);
    });

    it('moves an item to the end when dropped in the empty space after the last item', async () => {
      renderRow(direction);
      // one slot past the last item, toward the end of the row
      dragTo('a', offsetFromCentre('c', direction === 'rtl' ? -SLOT_WIDTH : SLOT_WIDTH));
      await Promise.resolve();
      expect(renderedOrder()).toEqual(['b', 'c', 'a']);
    });
  });

  describe('rtl', () => {
    it('leaves the item in place until the pointer passes the middle of its neighbour', async () => {
      renderRow('rtl');
      // over the neighbour, but on the half nearer the dragged item
      dragTo('a', offsetFromCentre('b', SLOT_WIDTH / 4));
      await Promise.resolve();
      expect(renderedOrder()).toEqual(['a', 'b', 'c']);
    });
  });
});

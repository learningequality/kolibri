import { render, screen } from '@testing-library/vue';
import { nextTick, ref } from 'vue';
import CoreMenu from '../index.vue';
import CoreMenuOption from '../CoreMenuOption.vue';

const OPENER = 'Opener';
const ELSEWHERE = 'Elsewhere';
const OPTION = 'Option';

const showMenu = ref(false);

const Host = {
  name: 'Host',
  components: { CoreMenu, CoreMenuOption },
  setup() {
    return { showMenu, OPENER, ELSEWHERE, OPTION };
  },
  template: `
    <div>
      <button>{{ OPENER }}</button>
      <button>{{ ELSEWHERE }}</button>
      <CoreMenu v-if="showMenu">
        <template #options>
          <CoreMenuOption :label="OPTION" />
        </template>
      </CoreMenu>
    </div>
  `,
};

async function mountMenuWithOpenerFocused() {
  showMenu.value = false;
  render(Host, { routes: [] });
  screen.getByRole('button', { name: OPENER }).focus();
  showMenu.value = true;
  await nextTick();
}

async function removeMenu() {
  showMenu.value = false;
  await nextTick();
  jest.runAllTimers();
}

describe('CoreMenu', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns focus to the element focused before it mounted when removed with focus inside it', async () => {
    await mountMenuWithOpenerFocused();
    screen.getByRole('menuitem', { name: OPTION }).focus();
    await removeMenu();
    expect(screen.getByRole('button', { name: OPENER })).toHaveFocus();
  });

  it('returns focus to the element focused before it mounted when removal fires focusout first', async () => {
    await mountMenuWithOpenerFocused();
    const option = screen.getByRole('menuitem', { name: OPTION });
    option.focus();
    // Chromium fires this inside removeChild, with focus already on the body.
    const host = option.closest('[role="presentation"]').parentNode;
    const removeChild = host.removeChild.bind(host);
    host.removeChild = child => {
      const removed = removeChild(child);
      option.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      return removed;
    };
    await removeMenu();
    expect(screen.getByRole('button', { name: OPENER })).toHaveFocus();
  });

  it('leaves focus on the body when removed after focus left it for the body', async () => {
    await mountMenuWithOpenerFocused();
    screen.getByRole('menuitem', { name: OPTION }).focus();
    document.activeElement.blur();
    await removeMenu();
    expect(document.body).toHaveFocus();
  });

  it('leaves focus where it is when removed while focus is outside it', async () => {
    await mountMenuWithOpenerFocused();
    screen.getByRole('button', { name: ELSEWHERE }).focus();
    await removeMenu();
    expect(screen.getByRole('button', { name: ELSEWHERE })).toHaveFocus();
  });
});

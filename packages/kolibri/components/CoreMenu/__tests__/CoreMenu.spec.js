import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CoreMenu from '../index.vue';
import CoreMenuOption from '../CoreMenuOption.vue';

const TRIGGER_LABEL = 'Open menu';
const OTHER_LABEL = 'Other control';
const OPTION_LABEL = 'Remove';

const Harness = {
  components: { CoreMenu, CoreMenuOption },
  data() {
    return { isMenuOpen: false };
  },
  template: `
    <div>
      <button @click="isMenuOpen = true">${TRIGGER_LABEL}</button>
      <button @click="isMenuOpen = false">${OTHER_LABEL}</button>
      <CoreMenu
        v-if="isMenuOpen"
        :isOpen="isMenuOpen"
        @close="isMenuOpen = false"
      >
        <template #options>
          <CoreMenuOption
            :label="'${OPTION_LABEL}'"
            @select="isMenuOpen = false"
          />
        </template>
      </CoreMenu>
    </div>
  `,
};

async function flushRestoreTimeout() {
  await new Promise(resolve => setTimeout(resolve));
}

describe('CoreMenu', () => {
  it('returns focus to the trigger when it is removed while holding focus', async () => {
    const user = userEvent.setup();
    render(Harness);

    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));
    await user.click(screen.getByRole('menuitem', { name: OPTION_LABEL }));
    await flushRestoreTimeout();

    expect(screen.getByRole('button', { name: TRIGGER_LABEL })).toHaveFocus();
  });

  it('leaves focus where it is when it is removed without holding focus', async () => {
    const user = userEvent.setup();
    render(Harness);

    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));
    await user.click(screen.getByRole('button', { name: OTHER_LABEL }));
    await flushRestoreTimeout();

    expect(screen.getByRole('button', { name: OTHER_LABEL })).toHaveFocus();
  });
});

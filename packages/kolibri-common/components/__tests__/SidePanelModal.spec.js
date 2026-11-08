import { nextTick, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import SidePanelModal from '../SidePanelModal';

const HEADING = 'Page heading';
const OPENER = 'Open panel';
const PANEL_BUTTON = 'Save';

const panelOpen = ref(false);
const openerShown = ref(true);

const Page = {
  name: 'Page',
  setup: () => ({ panelOpen, openerShown }),
  render(h) {
    return h('div', { attrs: { id: 'main' } }, [
      h('h1', HEADING),
      this.openerShown ? h('button', OPENER) : null,
      this.panelOpen
        ? h(SidePanelModal, { props: { alignment: 'right' } }, [h('button', PANEL_BUTTON)])
        : null,
    ]);
  },
};

async function flushTimers() {
  await nextTick();
  await new Promise(resolve => setTimeout(resolve));
}

async function openPanelFromOpener() {
  render(Page);
  screen.getByRole('button', { name: OPENER }).focus();
  panelOpen.value = true;
  await flushTimers();
  screen.getByRole('button', { name: PANEL_BUTTON }).focus();
}

describe('SidePanelModal focus on close', () => {
  beforeEach(() => {
    panelOpen.value = false;
    openerShown.value = true;
  });

  it('returns focus to its opener', async () => {
    await openPanelFromOpener();
    panelOpen.value = false;
    await flushTimers();
    expect(screen.getByRole('button', { name: OPENER })).toHaveFocus();
  });

  it('focuses the page heading when its opener is gone', async () => {
    await openPanelFromOpener();
    openerShown.value = false;
    panelOpen.value = false;
    await flushTimers();
    expect(screen.getByRole('heading', { name: HEADING })).toHaveFocus();
  });

  it('leaves focus on the page heading when it took focus after the panel closed', async () => {
    await openPanelFromOpener();
    const heading = screen.getByRole('heading', { name: HEADING });
    heading.setAttribute('tabindex', '-1');
    panelOpen.value = false;
    await nextTick();
    heading.focus();
    await new Promise(resolve => setTimeout(resolve));
    expect(heading).toHaveFocus();
  });
});

import { render, screen } from '@testing-library/vue';
import SidePanelModal from '../index.vue';

const FIRST_TITLE = 'First title';
const SECOND_TITLE = 'Second title';
const LABEL = 'Panel label';

const Host = {
  props: {
    ariaLabel: { type: String, default: null },
    headingId: { type: String, default: null },
    showSecond: { type: Boolean, default: false },
  },
  render(h) {
    return h(SidePanelModal, {
      props: { alignment: 'right', ariaLabel: this.ariaLabel },
      scopedSlots: {
        header: () =>
          this.showSecond
            ? h('h1', { key: 'second' }, SECOND_TITLE)
            : h('h1', { key: 'first', attrs: { id: this.headingId } }, FIRST_TITLE),
      },
    });
  },
};

describe('SidePanelModal', () => {
  it('is a modal dialog named by the ariaLabel prop', () => {
    render(Host, { props: { ariaLabel: LABEL } });
    const dialog = screen.getByRole('dialog', { name: LABEL });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('is named by the header heading when no ariaLabel is given', () => {
    render(Host);
    expect(screen.getByRole('dialog', { name: FIRST_TITLE })).toBeInTheDocument();
  });

  it("keeps the header heading's own id", () => {
    render(Host, { props: { headingId: 'existing-id' } });
    expect(screen.getByRole('dialog', { name: FIRST_TITLE })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: FIRST_TITLE })).toHaveAttribute('id', 'existing-id');
  });

  it('is named by a header heading that replaces the first one', async () => {
    const { updateProps } = render(Host);
    await updateProps({ showSecond: true });
    expect(screen.getByRole('dialog', { name: SECOND_TITLE })).toBeInTheDocument();
  });
});

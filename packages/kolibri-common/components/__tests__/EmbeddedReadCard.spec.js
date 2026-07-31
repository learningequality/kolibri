import { fireEvent, render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import EmbeddedReadCard from '../EmbeddedReadCard';

function renderCard(props = {}) {
  return render(EmbeddedReadCard, {
    props: {
      active: false,
      ...props,
    },
    slots: {
      default: '<span data-testid="viewer">Viewer</span>',
    },
  });
}

describe('EmbeddedReadCard', () => {
  it('renders its slot content when inactive', () => {
    renderCard();
    screen.getByTestId('viewer');
  });

  it('renders its slot content when active', () => {
    renderCard({ active: true });
    screen.getByTestId('viewer');
  });

  it('exposes no button affordance when inactive', () => {
    renderCard();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('exposes the card as a labelled button when active', () => {
    renderCard({ active: true });
    screen.getByRole('button', { name: coreString('read') });
  });

  it('emits read when the active card is clicked', async () => {
    const { emitted } = renderCard({ active: true });
    await userEvent.click(screen.getByRole('button', { name: coreString('read') }));
    expect(emitted().read).toBeTruthy();
  });

  it('does not emit read when the inactive card is clicked', async () => {
    const { container, emitted } = renderCard();
    await fireEvent.click(container.firstChild);
    expect(emitted().read).toBeUndefined();
  });

  it('emits read on enter and space when active', async () => {
    const { emitted } = renderCard({ active: true });
    const card = screen.getByRole('button', { name: coreString('read') });
    card.focus();
    await userEvent.keyboard('{enter}');
    await userEvent.keyboard(' ');
    expect(emitted().read).toHaveLength(2);
  });

  it('takes the wrapped content out of the tab order and a11y tree when active', () => {
    renderCard({ active: true });
    expect(screen.getByTestId('viewer').parentElement).toHaveAttribute('inert');
  });

  it('leaves the wrapped content interactive when inactive', () => {
    renderCard();
    expect(screen.getByTestId('viewer').parentElement).not.toHaveAttribute('inert');
  });

  it('does not emit read on enter or space when inactive', async () => {
    const { container, emitted } = renderCard();
    await fireEvent.keyDown(container.firstChild, { key: 'Enter' });
    await fireEvent.keyDown(container.firstChild, { key: ' ' });
    expect(emitted().read).toBeUndefined();
  });
});

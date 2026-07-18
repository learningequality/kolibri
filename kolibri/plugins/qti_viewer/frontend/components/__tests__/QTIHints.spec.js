import { render, screen } from '@testing-library/vue';
import QTIHints from '../QTIHints.vue';

const FIRST_HINT = 'First hint';
const SECOND_HINT = 'Second hint';
const HINT_1_LABEL = 'Hint 1';
const HINT_2_LABEL = 'Hint 2';
const IMAGE_ALT = 'Diagram';

describe('QTIHints', () => {
  it('renders each revealed hint with a numbered label', () => {
    render(QTIHints, {
      props: { hints: [`<p>${FIRST_HINT}</p>`, `<p>${SECOND_HINT}</p>`] },
    });
    expect(screen.getByText(FIRST_HINT)).toBeInTheDocument();
    expect(screen.getByText(SECOND_HINT)).toBeInTheDocument();
    expect(screen.getByText(HINT_1_LABEL)).toBeInTheDocument();
    expect(screen.getByText(HINT_2_LABEL)).toBeInTheDocument();
  });

  it('renders hints in document order', () => {
    render(QTIHints, {
      props: { hints: [`<p>${FIRST_HINT}</p>`, `<p>${SECOND_HINT}</p>`] },
    });
    const first = screen.getByText(FIRST_HINT);
    const second = screen.getByText(SECOND_HINT);
    // eslint-disable-next-line no-bitwise
    const firstPrecedesSecond =
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(firstPrecedesSecond).toBeTruthy();
  });

  it('renders an image contained in a hint', () => {
    render(QTIHints, {
      props: {
        hints: [`<p>See <img src="data:image/png;base64,iVBORw0KGgo=" alt="${IMAGE_ALT}"></p>`],
      },
    });
    expect(screen.getByAltText(IMAGE_ALT)).toBeInTheDocument();
  });

  it('renders no list when there are no hints', () => {
    render(QTIHints, { props: { hints: [] } });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

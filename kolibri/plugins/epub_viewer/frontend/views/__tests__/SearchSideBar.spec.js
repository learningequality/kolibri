import { render, screen } from '@testing-library/vue';
import SearchSideBar from '../SearchSideBar';

describe('Search side bar', () => {
  function renderComponent() {
    return render(SearchSideBar, {
      props: {
        book: {},
      },
      attachTo: document.body,
    });
  }

  it('should render', () => {
    renderComponent();

    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
  });

  it('should allow parent to focus on input box', async () => {
    renderComponent();

    const input = screen.getByRole('searchbox');

    input.focus();

    expect(document.activeElement).toBe(input);
  });
});
import { render, screen, fireEvent } from '@testing-library/vue';
import SearchButton from '../SearchButton';

describe('Search button', () => {
  it('should render', () => {
    render(SearchButton);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should emit an event when the button is clicked', async () => {
    const { emitted } = render(SearchButton);

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(emitted().click).toBeTruthy();
  });
});

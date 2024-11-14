import { render, screen } from '@testing-library/vue';
import CoreMenuDivider from '../CoreMenuDivider.vue';

describe('CoreMenuDivider', () => {
  test('renders the component', () => {
    render(CoreMenuDivider);

    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});

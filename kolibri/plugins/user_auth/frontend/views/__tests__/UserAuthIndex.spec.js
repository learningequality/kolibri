import { render } from '@testing-library/vue';
import UserAuthIndex from '../UserAuthIndex';

describe('user index page component', () => {
  it('smoke test', () => {
    const { container } = render(UserAuthIndex, {
      routes: [],
    });
    expect(container).toBeInTheDocument();
  });
});

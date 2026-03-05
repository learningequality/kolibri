import { render } from '@testing-library/vue';
import '@testing-library/jest-dom';
import UserAuthIndex from '../UserAuthIndex';
import makeStore from '../../__tests__/utils/makeStore';

describe('user index page component', () => {
  it('smoke test', () => {
    const { container } = render(UserAuthIndex, {
      store: makeStore(),
      routes: [],
    });
    expect(container).toBeInTheDocument();
  });
});

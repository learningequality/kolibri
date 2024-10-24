import { render, screen } from '@testing-library/vue';
import ContentRendererLoading from '../ContentRendererLoading.vue';

describe('ContentRendererLoading', () => {
  test('the component should render correctly', () => {
    render(ContentRendererLoading);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

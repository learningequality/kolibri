import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import CoreMenuDivider from '../CoreMenuDivider.vue';

describe('CoreMenuDivider', () => {
  test('renders the component', () => {
    render(CoreMenuDivider, {
      routes: new VueRouter(),
    });

    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });
});

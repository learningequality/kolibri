import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import GenderSelect from '../GenderSelect.vue';
import '@testing-library/jest-dom';

const renderComponent = () => {
  return render(GenderSelect, {
    routes: new VueRouter(),
  });
};

describe('GenderSelect', () => {
  test('renders correctly with label placeholder and options', async () => {
    renderComponent();

    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });
});

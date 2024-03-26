import { render, fireEvent, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import CoreMenuOption from '../CoreMenuOption.vue';
import '@testing-library/jest-dom';

const sampleSubRoutes = [
  { name: 'subRoute1', label: 'Sub Route 1' },
  { name: 'subRoute2', label: 'Sub Route 2' },
  { name: 'subRoute3', label: 'Sub Route 3' },
];
const sampleLink = 'https://mockurl.com/';
const sampleIcon = 'add';

const renderComponent = props => {
  return render(CoreMenuOption, {
    props: {
      subRoutes: [],
      ...props,
    },
    routes: new VueRouter(),
  });
};

describe('CoreMenuOption', () => {
  describe('subRoutes toggle', () => {
    describe('when subRoutes are provided', () => {
      it('should render with the chevronDown icon initially with the subroutes not visible', () => {
        renderComponent({ subRoutes: sampleSubRoutes });

        expect(screen.getByRole('menuitem')).toBeInTheDocument();
        expect(screen.getByTestId('icon-chevronDown')).toBeInTheDocument();
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.queryByText(subRoute.label)).not.toBeInTheDocument()
        );
      });

      it('should toggle submenu visibility on click and the icons should change accordingly', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });
        const menuItem = screen.getByRole('menuitem');

        // Clicking should show the subroutes
        await fireEvent.click(menuItem);
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.getByText(subRoute.label)).toBeInTheDocument()
        );
        expect(screen.getByTestId('icon-chevronUp')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronDown')).not.toBeInTheDocument();

        // Clicking again should hide the subroutes
        await fireEvent.click(menuItem);
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.queryByText(subRoute.label)).not.toBeInTheDocument()
        );
        expect(screen.getByTestId('icon-chevronDown')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronUp')).not.toBeInTheDocument();
      });

      it('should toggle submenu visibility on pressing Enter key', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });
        const menuItem = screen.getByRole('menuitem');

        // Pressing Enter should show the subroutes
        await fireEvent.keyDown(menuItem, { key: 'Enter', code: 'Enter' });
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.getByText(subRoute.label)).toBeInTheDocument()
        );
        expect(screen.getByTestId('icon-chevronUp')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronDown')).not.toBeInTheDocument();

        // Pressing Enter again should hide the subroutes
        await fireEvent.keyDown(menuItem, { key: 'Enter', code: 'Enter' });
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.queryByText(subRoute.label)).not.toBeInTheDocument()
        );
        expect(screen.getByTestId('icon-chevronDown')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronUp')).not.toBeInTheDocument();
      });

      it('should display the label of the option when provided', () => {
        renderComponent({ label: 'Sample Option', subRoutes: sampleSubRoutes });
        expect(screen.getByText('Sample Option')).toBeInTheDocument();
      });

      it('should display the secondary text of the option when provided', () => {
        renderComponent({ secondaryText: 'Secondary Text', subRoutes: sampleSubRoutes });
        expect(screen.getByText('Secondary Text')).toBeInTheDocument();
      });

      it('should display the icon of the option when provided', () => {
        renderComponent({ icon: sampleIcon, subRoutes: sampleSubRoutes });
        expect(screen.getByTestId(`icon-${sampleIcon}`)).toBeInTheDocument();
      });
    });

    describe('when subRoutes are not provided', () => {
      it('should render the menuitem with the provided URL', () => {
        renderComponent({ subRoutes: [], link: sampleLink });

        const menuItem = screen.getByRole('menuitem');
        expect(menuItem).toBeInTheDocument();
        expect(menuItem).toHaveAttribute('href', sampleLink);
      });

      it('should render the icon of the option when provided', () => {
        renderComponent({
          icon: sampleIcon,
          subRoutes: [],
        });
        expect(screen.getByTestId(`icon-${sampleIcon}`)).toBeInTheDocument();
      });

      it('should display the label of the option when provided', () => {
        renderComponent({ label: 'Sample Option', subRoutes: [] });
        expect(screen.getByText('Sample Option')).toBeInTheDocument();
      });

      describe('testing the user interactions', () => {
        const testcases = [
          {
            name: 'should emit with link is not provided and is not disabled',
            disabled: false,
            link: null,
            expected: true,
          },
          {
            name: 'should not emit when disabled',
            disabled: true,
            link: null,
            expected: false,
          },
          {
            name: 'should not emit when link is provided',
            disabled: false,
            link: sampleLink,
            expected: false,
          },
        ];

        test.each(testcases)('%s [Mouse Click]', async ({ disabled, link, expected }) => {
          const { emitted } = renderComponent({ link, disabled, subRoutes: [] });

          await fireEvent.click(screen.getByRole('menuitem'));
          if (expected) {
            expect(emitted()).toHaveProperty('select');
            expect(emitted().select).toHaveLength(1);
          } else {
            expect(emitted()).not.toHaveProperty('select');
          }
        });

        test.each(testcases)('%s [Enter Key]', async ({ disabled, link, expected }) => {
          const { emitted } = renderComponent({ link, disabled, subRoutes: [] });

          await fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter', code: 'Enter' });
          if (expected) {
            expect(emitted()).toHaveProperty('select');
            expect(emitted().select).toHaveLength(1);
          } else {
            expect(emitted()).not.toHaveProperty('select');
          }
        });
      });
    });
  });
});

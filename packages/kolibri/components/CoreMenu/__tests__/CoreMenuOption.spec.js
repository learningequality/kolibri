import { render, screen, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import CoreMenuOption from '../CoreMenuOption.vue';

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
  test('smoke test', () => {
    renderComponent();
    expect(screen.getByRole('menuitem')).toBeInTheDocument();
  });

  describe('subRoutes toggle', () => {
    describe('when subRoutes are provided', () => {
      it('should render with the chevronDown icon initially with the subroutes not visible', () => {
        renderComponent({ subRoutes: sampleSubRoutes });

        expect(screen.getByRole('menuitem')).toBeInTheDocument();
        expect(screen.getByTestId('icon-chevronDown')).toBeInTheDocument();
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.queryByText(subRoute.label)).not.toBeInTheDocument(),
        );
      });

      it('should open the submenu on clicking and the icons should change accordingly', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });
        const menuItem = screen.getByRole('menuitem');

        // Clicking should show the subroutes
        await userEvent.click(menuItem);
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.getByText(subRoute.label)).toBeInTheDocument(),
        );
        expect(screen.getByTestId('icon-chevronUp')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronDown')).not.toBeInTheDocument();
      });

      it('should close the submenu on clicking if it is open and the icons should change accordingly', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });
        const menuItem = screen.getByRole('menuitem');

        // Click to show the subroutes
        await userEvent.click(menuItem);

        // Clicking again should hide the subroutes
        await userEvent.click(menuItem);
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.queryByText(subRoute.label)).not.toBeInTheDocument(),
        );
        expect(screen.getByTestId('icon-chevronDown')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronUp')).not.toBeInTheDocument();
      });

      it('should open the submenu on pressing Enter key and the icons should change accordingly', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });
        // Pressing Enter should show the subroutes

        await fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' });
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.getByText(subRoute.label)).toBeInTheDocument(),
        );
        expect(screen.getByTestId('icon-chevronUp')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronDown')).not.toBeInTheDocument();
      });

      it('should close the submenu on pressing Enter key if it is open and the icons should change accordingly', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });
        const menuItem = screen.getByRole('menuitem');

        // Pressing Enter to show the subroutes
        await fireEvent.keyDown(menuItem, { key: 'Enter' });

        // Pressing Enter again should hide the subroutes
        await fireEvent.keyDown(menuItem, { key: 'Enter' });
        sampleSubRoutes.forEach(subRoute =>
          expect(screen.queryByText(subRoute.label)).not.toBeInTheDocument(),
        );
        expect(screen.getByTestId('icon-chevronDown')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-chevronUp')).not.toBeInTheDocument();
      });

      it('pressing tab from keyboard should focus the menuitem', async () => {
        renderComponent({ subRoutes: sampleSubRoutes });

        await userEvent.tab();
        expect(screen.getByRole('menuitem')).toHaveFocus();
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

      it('pressing tab from keyboard should focus the menuitem', async () => {
        renderComponent({ subRoutes: [] });

        // Press tab to focus the menuitem
        await userEvent.tab();
        expect(screen.getByRole('menuitem')).toHaveFocus();
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

          await userEvent.click(screen.getByRole('menuitem'));
          if (expected) {
            expect(emitted()).toHaveProperty('select');
            expect(emitted().select).toHaveLength(1);
          } else {
            expect(emitted()).not.toHaveProperty('select');
          }
        });

        test.each(testcases)('%s [Enter Key]', async ({ disabled, link, expected }) => {
          const { emitted } = renderComponent({ link, disabled, subRoutes: [] });

          await fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' });
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

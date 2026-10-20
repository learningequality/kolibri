import { render, screen } from '@testing-library/vue';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import UpNextNavigationFooter from '../UpNextNavigationFooter.vue';

const { footerNavigationAccessibleLabel$, footerNavigationUnavailableAccessibleLabel$ } =
  coursesStrings;

describe('UpNextNavigationFooter', () => {
  it('names the enabled button by combining the label and the item title', () => {
    render(UpNextNavigationFooter, {
      props: {
        label: 'Up next',
        nextNode: { title: 'Fractions' },
        nextEnabled: true,
      },
    });

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(
      footerNavigationAccessibleLabel$({ label: 'Up next', title: 'Fractions' }),
    );
    expect(button).toBeEnabled();
  });

  it('names the locked button as unavailable, including the item title', () => {
    render(UpNextNavigationFooter, {
      props: {
        label: 'Up next',
        nextNode: { title: 'Fractions' },
        nextEnabled: false,
      },
    });

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(
      footerNavigationUnavailableAccessibleLabel$({ title: 'Fractions' }),
    );
    expect(button).toBeDisabled();
  });
});

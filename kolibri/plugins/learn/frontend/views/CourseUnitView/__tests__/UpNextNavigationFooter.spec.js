import { render, screen } from '@testing-library/vue';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import UpNextNavigationFooter from '../UpNextNavigationFooter.vue';

const {
  footerNavigationAccessibleLabel$,
  footerNavigationUnavailableAccessibleLabel$,
  upNextLabel$,
} = coursesStrings;

const ITEM_TITLE = 'Fractions';

describe('UpNextNavigationFooter', () => {
  it('names the enabled button by combining the label and the item title', () => {
    render(UpNextNavigationFooter, {
      props: {
        label: upNextLabel$(),
        nextNode: { title: ITEM_TITLE },
        nextEnabled: true,
      },
    });

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(
      footerNavigationAccessibleLabel$({ label: upNextLabel$(), title: ITEM_TITLE }),
    );
    expect(button).toBeEnabled();
  });

  it('names the locked button as unavailable, including the item title', () => {
    render(UpNextNavigationFooter, {
      props: {
        label: upNextLabel$(),
        nextNode: { title: ITEM_TITLE },
        nextEnabled: false,
      },
    });

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(
      footerNavigationUnavailableAccessibleLabel$({ title: ITEM_TITLE }),
    );
    expect(button).toBeDisabled();
  });
});

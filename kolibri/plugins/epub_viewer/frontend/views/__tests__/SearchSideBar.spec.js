import { render, screen, fireEvent } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';
import SearchSideBar from '../SearchSideBar';

const FOCUS_BUTTON_TEXT = 'Focus';

describe('Search side bar', () => {
  function renderComponent() {
    return render(SearchSideBar, {
      props: {
        book: {},
      },
      attachTo: document.body,
    });
  }

  it('should render', () => {
    renderComponent();

    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
  });

  it('should allow parent to focus on input box', async () => {
    const Parent = defineComponent({
      components: { SearchSideBar },
      setup() {
        // eslint-disable-next-line vue/no-unused-properties
        const sidebarRef = ref(null);

        // eslint-disable-next-line vue/no-unused-properties
        function focusInput() {
          sidebarRef.value.focusOnInput();
        }

        // eslint-disable-next-line vue/no-unused-properties
        return { sidebarRef, focusInput };
      },
      template: ` <div>
        <SearchSideBar ref="sidebarRef" :book="{}" />
        <button @click="focusInput">${FOCUS_BUTTON_TEXT}</button>
      </div> `,
    });

    render(Parent, { attachTo: document.body });

    const button = screen.getByRole('button', { name: FOCUS_BUTTON_TEXT });
    button.click();

    const input = screen.getByRole('searchbox');
    expect(input).toHaveFocus();
  });

  it('should let escape from the input reach the ancestor that closes the side bar', async () => {
    const closeSideBar = jest.fn();
    const Parent = defineComponent({
      components: { SearchSideBar },
      setup() {
        // eslint-disable-next-line vue/no-unused-properties
        return { closeSideBar };
      },
      template: ` <div @keyup.esc="closeSideBar">
        <SearchSideBar :book="{}" />
      </div> `,
    });

    render(Parent, { attachTo: document.body });

    await fireEvent.keyUp(screen.getByRole('searchbox'), { key: 'Escape' });

    expect(closeSideBar).toHaveBeenCalled();
  });

  it('should suppress the native search field clear on escape', () => {
    renderComponent();

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    screen.getByRole('searchbox').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

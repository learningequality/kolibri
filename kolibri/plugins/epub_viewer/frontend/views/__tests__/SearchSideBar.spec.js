import { render, screen } from '@testing-library/vue';
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
});

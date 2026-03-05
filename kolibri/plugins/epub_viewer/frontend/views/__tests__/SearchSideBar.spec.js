import { render, screen } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';
import SearchSideBar from '../SearchSideBar';

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
        const sidebarRef = ref(null);

        function focusInput() {
          sidebarRef.value.focusOnInput();
        }

        return { sidebarRef, focusInput };
      },
      template: ` <div>
          <SearchSideBar ref="sidebarRef" :book="{}" />
          <button @click="focusInput">Focus</button>
        </div> `,
    });

    render(Parent, { attachTo: document.body });

    const button = screen.getByRole('button', { name: 'Focus' });
    button.click();

    const input = screen.getByRole('searchbox');
    expect(input).toHaveFocus();
  });
});

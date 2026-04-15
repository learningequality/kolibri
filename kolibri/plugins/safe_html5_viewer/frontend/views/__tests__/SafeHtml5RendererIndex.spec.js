import { render, screen, waitFor } from '@testing-library/vue';
import SafeHtml5RendererIndex from '../SafeHtml5RendererIndex.vue';

jest.mock('kolibri-common/components/SafeHTML/style.scss', () => ({}));
jest.mock('kolibri-zip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn().mockResolvedValue({
      toString: () => `
        <h1>Mocked HTML content</h1>
        <table>
          <caption>Mocked 3-column Table</caption>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
            <td>Cell 3</td>
          </tr>
        </table>
        `,
    }),
  }));
});

const MOCK_HEADING_TEXT = 'Mocked HTML content';
const MOCK_TABLE_TEXT = 'Mocked 3-column Table';
const MOCK_CELL_TEXT = 'Cell 1';
const DUMMY_HTML5_URL = 'mock://test.html';
const renderComponent = (dataOverrides = {}) => {
  return render(SafeHtml5RendererIndex, {
    data: () => ({
      defaultFile: { storage_url: DUMMY_HTML5_URL },
      ...dataOverrides,
    }),
  });
};

async function setupTableContainer(scrollWidth, clientWidth) {
  let tableContainer;
  await waitFor(() => {
    tableContainer = document.querySelector('.table-container');
    expect(tableContainer).toBeInTheDocument();
  });

  Object.defineProperties(tableContainer, {
    scrollWidth: { get: () => scrollWidth },
    clientWidth: { get: () => clientWidth },
  });

  return tableContainer;
}

describe('SafeHtml5RendererIndex', () => {
  describe('first render', () => {
    it('smoke test', async () => {
      renderComponent();
      expect(screen.getByTestId('safe-html-renderer-container')).toBeInTheDocument();
    });

    it('shows KCircularLoader initially', async () => {
      renderComponent();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('hides KCircularLoader after loading', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('renders safe-html-wrapper div and HTML content after loading finishes', async () => {
      renderComponent();
      await waitFor(() => {
        expect(
          screen.getByLabelText(SafeHtml5RendererIndex.$trs.articleContent),
        ).toBeInTheDocument();
        expect(screen.getByText(MOCK_HEADING_TEXT)).toBeInTheDocument();
        expect(screen.getByText(MOCK_TABLE_TEXT)).toBeInTheDocument();
        expect(screen.getByText(MOCK_CELL_TEXT)).toBeInTheDocument();
      });
    });
  });

  describe("table's tabindex", () => {
    it("a table has tabindex='0' when scrollable", async () => {
      renderComponent();
      const tableContainer = await setupTableContainer(600, 500); // scrollWidth > clientWidth
      window.dispatchEvent(new Event('resize')); // Resize to trigger `applyTabIndexes`

      expect(tableContainer).toHaveAttribute('tabindex', '0');
    });

    it("a table doesn't have tabindex='0' when non-scrollable", async () => {
      renderComponent();
      const tableContainer = await setupTableContainer(600, 800); // scrollWidth < clientWidth
      window.dispatchEvent(new Event('resize'));

      expect(tableContainer).not.toHaveAttribute('tabindex', '0');
    });
  });

  describe('progress tracking', () => {
    it('emits startTracking on created', async () => {
      const { emitted } = renderComponent();
      await waitFor(() => {
        expect(emitted()).toHaveProperty('startTracking');
        expect(emitted().startTracking).toHaveLength(1);
      });
    });

    it('emits stopTracking on destroy', async () => {
      const { emitted, unmount } = renderComponent();
      await waitFor(() => {
        expect(
          screen.getByLabelText(SafeHtml5RendererIndex.$trs.articleContent),
        ).toBeInTheDocument();
      });
      unmount();

      expect(emitted()).toHaveProperty('stopTracking');
      expect(emitted().stopTracking).toHaveLength(1);
    });
  });

  describe('scroll-based progress tracking', () => {
    it('emits `updateProgress` event with scroll-based progress when user scrolls', async () => {
      jest.useFakeTimers();
      const { emitted } = renderComponent({
        scrollBasedProgress: 0.5,
      });
      await waitFor(() => {
        expect(
          screen.getByLabelText(SafeHtml5RendererIndex.$trs.articleContent),
        ).toBeInTheDocument();
      });

      jest.advanceTimersByTime(5000);

      expect(emitted()).toHaveProperty('updateProgress');
      expect(emitted().updateProgress).toHaveLength(1);
      jest.useRealTimers();
    });

    it('emits `finished` event when progress reaches 1', async () => {
      jest.useFakeTimers();
      const { emitted } = renderComponent({
        scrollBasedProgress: 1,
      });
      await waitFor(() => {
        expect(
          screen.getByLabelText(SafeHtml5RendererIndex.$trs.articleContent),
        ).toBeInTheDocument();
      });

      jest.advanceTimersByTime(5000);

      expect(emitted().finished).toBeTruthy();
      expect(emitted().finished).toHaveLength(1);
      jest.useRealTimers();
    });

    it('removes scroll listener on component destroy', async () => {
      const { container, unmount } = renderComponent({
        debouncedHandleScroll: jest.fn(),
      });
      await waitFor(() => {
        expect(
          screen.getByLabelText(SafeHtml5RendererIndex.$trs.articleContent),
        ).toBeInTheDocument();
      });

      const wrapper = container.querySelector('[data-testid="safe-html-wrapper"]');
      const removeEventListenerSpy = jest.spyOn(wrapper, 'removeEventListener');
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });
});

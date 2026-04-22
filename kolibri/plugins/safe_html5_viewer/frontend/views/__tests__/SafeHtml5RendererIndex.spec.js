import { render, screen, waitFor } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import SafeHtml5RendererIndex from '../SafeHtml5RendererIndex.vue';

const { articleContent$ } = createTranslator(
  SafeHtml5RendererIndex.name,
  SafeHtml5RendererIndex.$trs,
);

jest.mock('kolibri-common/components/SafeHTML/style.scss', () => ({}));

const HEADING = 'Mocked HTML content';
const TABLE_CAPTION = 'Mocked 3-column Table';
const CELLS = ['Cell 1', 'Cell 2', 'Cell 3'];

jest.mock('kolibri-zip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn().mockResolvedValue({
      toString: () => `
        <h1>${HEADING}</h1>
        <table>
          <caption>${TABLE_CAPTION}</caption>
          <tr>
            <td>${CELLS[0]}</td>
            <td>${CELLS[1]}</td>
            <td>${CELLS[2]}</td>
          </tr>
        </table>
        `,
    }),
  }));
});

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
        expect(screen.getByLabelText(articleContent$())).toBeInTheDocument();
        expect(screen.getByText(HEADING)).toBeInTheDocument();
        expect(screen.getByText(TABLE_CAPTION)).toBeInTheDocument();
        CELLS.forEach(cell => expect(screen.getByText(cell)).toBeInTheDocument());
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
        expect(screen.getByLabelText(articleContent$())).toBeInTheDocument();
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
        expect(screen.getByLabelText(articleContent$())).toBeInTheDocument();
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
        expect(screen.getByLabelText(articleContent$())).toBeInTheDocument();
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
        expect(screen.getByLabelText(articleContent$())).toBeInTheDocument();
      });

      const wrapper = container.querySelector('[data-testid="safe-html-wrapper"]');
      const removeEventListenerSpy = jest.spyOn(wrapper, 'removeEventListener');
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });
});

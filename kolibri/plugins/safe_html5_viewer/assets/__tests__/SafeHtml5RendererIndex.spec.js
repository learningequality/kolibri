import { render, screen, waitFor } from '@testing-library/vue';
import SafeHtml5RendererIndex from '../src/views/SafeHtml5RendererIndex.vue';

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

const DUMMY_HTML5_URL = 'mock://test.html';
const renderComponent = () => {
  return render(SafeHtml5RendererIndex, {
    data: () => ({
      defaultFile: { storage_url: DUMMY_HTML5_URL },
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
    test('smoke test', async () => {
      renderComponent();
      expect(screen.getByTestId('safe-html-renderer-container')).toBeInTheDocument();
    });

    test('shows KCircularLoader initially', async () => {
      renderComponent();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('hides KCircularLoader after loading', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test('renders safe-html-wrapper div and HTML content after loading finishes', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByLabelText('Article content')).toBeInTheDocument();
        expect(screen.getByText('Mocked HTML content')).toBeInTheDocument();
        expect(screen.getByText('Mocked 3-column Table')).toBeInTheDocument();
        expect(screen.getByText('Cell 1')).toBeInTheDocument();
      });
    });
  });

  describe("table's tabindex", () => {
    test("a table has tabindex='0' when scrollable", async () => {
      renderComponent();
      const tableContainer = await setupTableContainer(600, 500); // scrollWidth > clientWidth
      window.dispatchEvent(new Event('resize')); // Resize to trigger `applyTabIndexes`

      expect(tableContainer).toHaveAttribute('tabindex', '0');
    });

    test("a table doesn't have tabindex='0' when non-scrollable", async () => {
      renderComponent();
      const tableContainer = await setupTableContainer(600, 800); // scrollWidth < clientWidth
      window.dispatchEvent(new Event('resize'));

      expect(tableContainer).not.toHaveAttribute('tabindex', '0');
    });
  });

  describe('windowSizeClass pass-through', () => {
    test("the 'small-window' class is applied to table caption when innerWidth <= 600", async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      renderComponent();
      await waitFor(() => {
        const caption = screen.getByText('Mocked 3-column Table');
        expect(caption).toHaveClass('small-window');
      });
    });

    test("the 'small-window' class is not applied to table caption when innerWidth > 600", async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });
      renderComponent();
      await waitFor(() => {
        const caption = screen.getByText('Mocked 3-column Table');
        expect(caption).not.toHaveClass('small-window');
      });
    });
  });

  describe('progress tracking', () => {
    test('emits startTracking on created', async () => {
      const { emitted } = renderComponent();
      await waitFor(() => {
        expect(emitted()).toHaveProperty('startTracking');
        expect(emitted().startTracking).toHaveLength(1);
      });
    });

    test('emits stopTracking on destroy', async () => {
      const { emitted, unmount } = renderComponent();
      await waitFor(() => {
        expect(screen.getByLabelText('Article content')).toBeInTheDocument();
      });
      unmount();

      expect(emitted()).toHaveProperty('stopTracking');
      expect(emitted().stopTracking).toHaveLength(1);
    });
  });
});

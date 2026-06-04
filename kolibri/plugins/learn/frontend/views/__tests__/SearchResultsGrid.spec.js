import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { createTranslator } from 'kolibri/utils/i18n';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { PageNames } from '../../constants.js';
import SearchResultsGrid from '../SearchResultsGrid.vue';

jest.mock('kolibri-common/composables/useBaseSearch');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');

const { viewMoreAction$, uncountedAdditionalResults$ } = coreStrings;
const { results$, viewAsList$ } = createTranslator(SearchResultsGrid.name, SearchResultsGrid.$trs);

function renderComponent(props = {}, { windowIsSmall = false } = {}) {
  useKResponsiveWindow.mockImplementation(() => ({
    windowIsSmall,
    windowIsLarge: !windowIsSmall,
    windowBreakpoint: ref(windowIsSmall ? 0 : 4),
  }));
  return render(SearchResultsGrid, {
    props: {
      results: [{ id: 'r1', title: 'Result 1' }],
      searchLoading: false,
      ...props,
    },
    routes: [
      { path: '/topics_topic', name: PageNames.TOPICS_TOPIC },
      { path: '/topics_content', name: PageNames.TOPICS_CONTENT },
    ],
  });
}

describe('SearchResultsGrid', () => {
  it('renders the results count as title when all results are shown', () => {
    renderComponent();
    expect(screen.getByTestId('search-results-title')).toHaveTextContent(results$({ results: 1 }));
  });

  it('renders an uncounted results title when there are more results', () => {
    renderComponent({ more: { next: true } });
    expect(screen.getByTestId('search-results-title')).toHaveTextContent(
      uncountedAdditionalResults$({ num: 1 }),
    );
  });

  it('renders the results grid', () => {
    renderComponent();
    expect(screen.getByTestId('search-results-card-grid')).toBeInTheDocument();
  });

  it('renders the list/grid view toggle buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: viewAsList$() })).toBeInTheDocument();
  });

  it('does not render the view toggle buttons on small screens', () => {
    renderComponent({}, { windowIsSmall: true });
    expect(screen.queryByRole('button', { name: viewAsList$() })).not.toBeInTheDocument();
  });

  it('renders the view more button when more results exist', () => {
    renderComponent({ more: { next: true } });
    expect(screen.getByText(viewMoreAction$())).toBeInTheDocument();
  });

  it('does not render the view more button when there are no more results', () => {
    renderComponent({ more: null });
    expect(screen.queryByText(viewMoreAction$())).not.toBeInTheDocument();
  });
});

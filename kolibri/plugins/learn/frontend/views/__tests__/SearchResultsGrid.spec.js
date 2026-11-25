import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import { nextTick, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import pluginData from 'kolibri-plugin-data';
import { createTranslator } from 'kolibri/utils/i18n';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { PageNames } from '../../constants.js';
import useContentNodeProgress from '../../composables/useContentNodeProgress';
import SearchResultsGrid from '../SearchResultsGrid.vue';
import stubHttp from './stubHttp';

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
  const router = new VueRouter({
    mode: 'abstract',
    routes: [
      { path: '/topics_topic', name: PageNames.TOPICS_TOPIC },
      { path: '/topics/c/:id', name: PageNames.TOPICS_CONTENT },
    ],
  });
  const rendered = render(SearchResultsGrid, {
    props: {
      results: [{ id: 'r1', title: 'Result 1' }],
      searchLoading: false,
      ...props,
    },
    routes: router,
  });
  return { ...rendered, router };
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

  it('opens the resource from the noninteractive footer area', async () => {
    const result = {
      id: 'resource',
      title: 'Audio resource',
      is_leaf: true,
      learning_activities: [],
      content_id: 'resource-with-progress',
    };
    const previousUrls = pluginData.urls;
    const progressPath = 'api/content/contentnodeprogress/';
    pluginData.urls = {
      prefix: '/',
      urls: { 'kolibri:core:contentnodeprogress_list': [[progressPath, []]] },
    };
    const httpStub = stubHttp(jest.spyOn, (method, { pathname }) => {
      if (method === 'GET' && pathname === `/${progressPath}`) {
        return [{ content_id: result.content_id, progress: 1 }];
      }
      throw new Error(`Unexpected request: ${method} ${pathname}`);
    });
    try {
      await useContentNodeProgress().fetchContentNodeProgress({ ids: result.id });
    } finally {
      httpStub.mockRestore();
      pluginData.urls = previousUrls;
    }
    const { router } = renderComponent({ results: [result] }, { windowIsSmall: true });

    await userEvent.click(screen.getByRole('progressbar'));

    expect(router.currentRoute.name).toBe(PageNames.TOPICS_CONTENT);
    expect(router.currentRoute.params.id).toBe(result.id);
  });
});

describe.each(['click', 'Enter'])('small-screen result activation by %s', activation => {
  const result = {
    id: 'resource',
    title: 'Audio resource',
    is_leaf: true,
    learning_activities: [],
  };

  async function activate(control) {
    await nextTick();
    const user = userEvent.setup();
    if (activation === 'click') {
      await user.click(control);
    } else {
      control.focus();
      await user.keyboard('{Enter}');
    }
  }

  it('opens the resource from its title link', async () => {
    const { router } = renderComponent({ results: [result] }, { windowIsSmall: true });
    await activate(screen.getByRole('link', { name: result.title }));
    expect(router.currentRoute.name).toBe(PageNames.TOPICS_CONTENT);
    expect(router.currentRoute.params.id).toBe(result.id);
  });
});

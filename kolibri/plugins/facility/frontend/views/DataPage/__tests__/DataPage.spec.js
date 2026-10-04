import { render, screen, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import client from 'kolibri/client';
import useFacility from 'kolibri-common/composables/useFacility';
import makeStore from '../../../__tests__/utils/makeStore';
import { PageNames } from '../../../constants';
import ImportInterface from '../ImportInterface';
import SyncInterface from '../SyncInterface';
import DataPage, { pageTitleStrings } from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const { documentTitle$ } = pageTitleStrings;
const { pageHeading$ } = createTranslator(DataPage.name, DataPage.$trs);
const { sectionTitle$ } = createTranslator(ImportInterface.name, ImportInterface.$trs);
const { syncData$ } = createTranslator(SyncInterface.name, SyncInterface.$trs);

async function renderPage() {
  const router = new VueRouter({
    routes: [
      { path: '/data', name: PageNames.DATA_EXPORT_PAGE },
      { path: '/data/import', name: PageNames.IMPORT_CSV_PAGE },
    ],
  });
  await router.push({ name: PageNames.DATA_EXPORT_PAGE });
  return render(DataPage, { store: makeStore(), router });
}

describe('DataPage', () => {
  beforeEach(async () => {
    client.__setPayload({ id: 'facility-1', name: 'Facility', dataset: { registered: false } });
    await useFacility().setFacilityId('facility-1');
    client.__setPayload([]);
  });

  it('titles the tab "Manage Data" with a hidden h1, its sections as h2s', async () => {
    document.title = '';
    await renderPage();
    await waitFor(() => expect(document.title).toBe(`${documentTitle$()} - Kolibri`));
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(documentTitle$());
    expect(headings[0]).toHaveClass('visuallyhidden');
    for (const name of [pageHeading$(), sectionTitle$(), syncData$()]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });
});

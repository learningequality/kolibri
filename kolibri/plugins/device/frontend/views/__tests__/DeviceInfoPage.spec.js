import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import makeStore from '../../__tests__/utils/makeStore';
import DeviceInfoPage, { pageTitleStrings } from '../DeviceInfoPage';

jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { deprecationWarnings: {} },
}));

const { header$ } = pageTitleStrings;

function renderComponent() {
  const store = makeStore();
  store.commit('deviceInfo/SET_STATE', {
    deviceInfo: { urls: [], device_id: 'abcdef', device_name: 'Device' },
  });
  pageLoading.value = false;
  return render(DeviceInfoPage, { store, routes: [] });
}

describe('DeviceInfoPage', () => {
  it('titles the tab with its visible header, the only h1', async () => {
    document.title = '';
    renderComponent();
    await nextTick();
    expect(document.title).toBe(`${header$()} - Kolibri`);
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(header$());
  });
});

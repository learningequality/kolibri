import { mount } from '@vue/test-utils';
import { now } from 'kolibri.utils.serverClock';
import ChannelListPage from '../../src/views/reports/ChannelListPage';
import { ViewBy } from '../../src/constants/reportConstants';
import makeStore from '../makeStore';

jest.mock('kolibri.utils.serverClock');

function makeWrapper(options = {}) {
  return mount(ChannelListPage, {
    ...options,
    stubs: ['report-subheading', 'NameCell', 'Breadcrumbs'],
    store: options.store || {},
  });
}

function getElements(wrapper) {
  return {
    channelRows: () => wrapper.findAll('tbody > tr'),
    headerText: () => wrapper.findAll('h1').at(0),
  };
}

describe('channel list page component', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
    store.state.core.channels.list = [
      { id: 'recent_channel', title: 'Recent Channel' },
      { id: 'not_recent_channel', title: 'Not Recent Channel' },
      { id: 'null_channel', title: 'Null Channel' },
    ];
    store.commit('reports/SET_STATE', {
      showRecentOnly: false,
      tableData: [
        {
          title: 'recent_channel',
          last_active: new Date('2017-04-20T21:17:58.810Z'),
          id: 'test1',
        },
        {
          title: 'not_recent_channel',
          last_active: new Date('2017-03-20T21:17:58.810Z'),
          id: 'test2',
        },
        {
          title: 'null_channel',
          last_active: null,
          id: 'test3',
        },
      ],
      viewBy: ViewBy.CHANNEL,
      sortColumn: '',
      sortOrder: '',
    });
    // sets clock to 4/19/2017
    now.mockReturnValue(new Date(2017, 3, 19));
  });

  describe('in "show everything" mode', () => {
    it('shows the correct header', () => {
      const wrapper = makeWrapper({ store });
      const { headerText } = getElements(wrapper);
      expect(headerText().text()).toEqual('Channels');
    });

    it('shows all channels, regardless of activity', () => {
      const wrapper = makeWrapper({ store });
      const { channelRows } = getElements(wrapper);
      // only checks the number of rows, not whether they are correct
      expect(channelRows().length).toEqual(3);
    });
  });

  describe('in "show recent only" mode', () => {
    beforeEach(() => {
      store.state.reports.showRecentOnly = true;
    });

    it('shows the "recent activity" header', () => {
      const wrapper = makeWrapper({ store });
      const { headerText } = getElements(wrapper);
      expect(headerText().text()).toEqual('Recent activity');
    });

    it('hides channels that have null or not-recent activity', async () => {
      const wrapper = makeWrapper({ store });
      const { channelRows } = getElements(wrapper);
      expect(channelRows().length).toEqual(1);
    });
  });
});

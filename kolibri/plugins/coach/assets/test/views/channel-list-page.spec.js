import Vuex from 'vuex';
import { mount } from '@vue/test-utils';
import { now } from 'kolibri.utils.serverClock';
import ChannelListPage from '../../src/views/reports/channel-list-page';
import { ViewBy } from '../../src/constants/reportConstants';

jest.mock('kolibri.utils.serverClock');

const initialState = () => ({
  classId: '',
  pageName: '',
  core: {
    channels: {
      list: [
        { id: 'recent_channel', title: 'Recent Channel' },
        { id: 'not_recent_channel', title: 'Not Recent Channel' },
        { id: 'null_channel', title: 'Null Channel' },
      ],
    },
  },
  pageState: {
    showRecentOnly: false,
    tableData: [
      {
        title: 'recent_channel',
        lastActive: new Date('2017-04-20T21:17:58.810Z'),
        id: 'test1',
      },
      {
        title: 'not_recent_channel',
        lastActive: new Date('2017-03-20T21:17:58.810Z'),
        id: 'test2',
      },
      {
        title: 'null_channel',
        lastActive: null,
        id: 'test3',
      },
    ],
    viewBy: ViewBy.CHANNEL,
    sortColumn: '',
    sortOrder: '',
  },
});

function makeWrapper(options = {}, state) {
  const store = new Vuex.Store({
    state: state || initialState(),
  });
  return mount(ChannelListPage, {
    ...options,
    stubs: ['report-subheading', 'name-cell', 'breadcrumbs'],
    store,
  });
}

function getElements(wrapper) {
  return {
    channelRows: () => wrapper.findAll('tbody > tr'),
    headerText: () => wrapper.findAll('h1').at(0),
  };
}

describe('channel list page component', () => {
  let state;

  beforeEach(() => {
    // sets clock to 4/19/2017
    now.mockReturnValue(new Date(2017, 3, 19));
    state = initialState();
  });

  describe('in "show everything" mode', () => {
    it('shows the correct header', () => {
      const wrapper = makeWrapper({}, state);
      const { headerText } = getElements(wrapper);
      expect(headerText().text()).toEqual('Content');
    });

    it('shows all channels, regardless of activity', () => {
      const wrapper = makeWrapper({}, state);
      const { channelRows } = getElements(wrapper);
      // only checks the number of rows, not whether they are correct
      expect(channelRows().length).toEqual(3);
    });
  });

  describe('in "show recent only" mode', () => {
    beforeEach(() => {
      state.pageState.showRecentOnly = true;
    });

    it('shows the "recent activity" header', () => {
      const wrapper = makeWrapper({}, state);
      const { headerText } = getElements(wrapper);
      expect(headerText().text()).toEqual('Recent activity');
    });

    it('hides channels that have null or not-recent activity', () => {
      const wrapper = makeWrapper({}, state);
      const { channelRows } = getElements(wrapper);
      expect(channelRows().length).toEqual(1);
    });
  });
});

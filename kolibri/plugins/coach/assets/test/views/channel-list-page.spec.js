/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import { mount } from '@vue/test-utils';
import ChannelListPage from '../../src/views/reports/channel-list-page';
import { ViewBy } from '../../src/constants/reportConstants';

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
  let clock;

  beforeEach(() => {
    state = initialState();
    // sets clock to 4/19/2017
    clock = sinon.useFakeTimers(Number(new Date(2017, 3, 19)));
  });

  afterEach(() => {
    clock.restore();
  });

  describe('in "show everything" mode', () => {
    it('shows the correct header', () => {
      const wrapper = makeWrapper({}, state);
      const { headerText } = getElements(wrapper);
      expect(headerText().text()).to.equal('Content');
    });

    it('shows all channels, regardless of activity', () => {
      const wrapper = makeWrapper({}, state);
      const { channelRows } = getElements(wrapper);
      // only checks the number of rows, not whether they are correct
      expect(channelRows().length).to.equal(3);
    });
  });

  describe('in "show recent only" mode', () => {
    beforeEach(() => {
      state.pageState.showRecentOnly = true;
    });

    it('shows the "recent activity" header', () => {
      const wrapper = makeWrapper({}, state);
      const { headerText } = getElements(wrapper);
      expect(headerText().text()).to.equal('Recent activity');
    });

    it('hides channels that have null or not-recent activity', () => {
      const wrapper = makeWrapper({}, state);
      const { channelRows } = getElements(wrapper);
      expect(channelRows().length).to.equal(1);
    });
  });
});

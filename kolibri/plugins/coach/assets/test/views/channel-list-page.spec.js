/* eslint-env mocha */
import Vue from 'vue-test';
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import ChannelListPage from '../../src/views/reports/channel-list-page';
import * as ReportConstants from '../../src/reportConstants';
import { mount } from 'avoriaz';

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
    viewBy: ReportConstants.ViewBy.CHANNEL,
    sortColumn: '',
    sortOrder: '',
  },
});

function makeWrapper(options = {}, state) {
  const store = new Vuex.Store({
    state: state || initialState(),
  });
  const components = {
    'report-subheading': '<div></div>',
    'name-cell': '<div></div>',
  };
  return mount(ChannelListPage, Object.assign(options, { store, components }));
}

function getElements(wrapper) {
  return {
    channelRows: () => wrapper.find('tbody > tr'),
    header: () => wrapper.find('.header')[0],
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
    it('does not show the "recent activity" header', () => {
      const wrapper = makeWrapper({}, state);
      const { header } = getElements(wrapper);
      assert(header() === undefined);
    });

    it('shows all channels, regardless of activity', () => {
      const wrapper = makeWrapper({}, state);
      const { channelRows } = getElements(wrapper);
      // only checks the number of rows, not whether they are correct
      assert.equal(channelRows().length, 3);
    });
  });

  describe('in "show recent only" mode', () => {
    beforeEach(() => {
      state.pageState.showRecentOnly = true;
    });

    it('shows the "recent activity" header', () => {
      const wrapper = makeWrapper({}, state);
      const { header } = getElements(wrapper);
      assert(header().is('div'));
    });

    it('hides channels that have null or not-recent activity', () => {
      const wrapper = makeWrapper({}, state);
      const { channelRows } = getElements(wrapper);
      assert.equal(channelRows().length, 1);
    });
  });
});

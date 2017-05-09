/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const assert = require('assert');
const _ = require('lodash');
const sinon = require('sinon');
const ChannelListPage = require('../../src/views/reports/channel-list-page');
const ReportConstants = require('../../src/reportConstants');

const initialState = () => ({
  classId: '',
  pageName: '',
  core: {
    channels: {
      list: [
        { id: 'recent_channel' },
        { id: 'not_recent_channel' },
        { id: 'null_channel' },
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

function makeVm(options = {}, state) {
  const store = new Vuex.Store({
    state: state || initialState(),
  });
  const components = {
    'name-cell': '<div></div>',
  };
  const Ctor = Vue.extend(ChannelListPage);
  return new Ctor(Object.assign(options, { store, components })).$mount();
}

function getElements(vm) {
  return {
    channelRows: () => vm.$el.querySelectorAll('tbody > tr'),
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
      const vm = makeVm({}, state);
      assert(_.isUndefined(vm.$refs.recentHeader));
    });

    it('shows all channels, regardless of activity', () => {
      const vm = makeVm({}, state);
      const { channelRows } = getElements(vm);
      // only checks the number of rows, not whether they are correct
      assert.equal(channelRows().length, 3);
    });
  });

  describe('in "show recent only" mode', () => {
    beforeEach(() => {
      state.pageState.showRecentOnly = true;
    });

    it('shows the "recent activity" header', () => {
      const vm = makeVm({}, state);
      assert(!_.isUndefined(vm.$refs.recentHeader));
    });

    it('hides channels that have null or not-recent activity', () => {
      const vm = makeVm({}, state);
      const { channelRows } = getElements(vm);
      assert.equal(channelRows().length, 1);
    });
  });
});

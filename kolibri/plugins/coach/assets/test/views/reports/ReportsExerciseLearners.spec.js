import { shallowMount, mount } from '@vue/test-utils';

import { STATUSES } from '../../../src/modules/classSummary/constants';
import ReportsExerciseLearners from '../../../src/views/reports/ReportsExerciseLearners';

const entries = [
  {
    id: 'd4b',
    name: 'learner1',
    username: 'learner1',
    groups: ['group1', 'group2'],
    exerciseLink: '#/2e3/reports/lessons/79b/exercises/a97/learners/d4b',
    statusObj: {
      learner_id: 'd4b',
      content_id: 'a97',
      status: STATUSES.completed,
      last_activity: new Date('2019-05-05T07:13:22Z'),
      time_spent: 92.5,
    },
  },
  {
    id: 'a5d',
    name: 'learner2',
    username: 'learner2',
    groups: ['group2'],
    exerciseLink: '#/2e3/reports/lessons/79b/exercises/a97/learners/a5d',
    statusObj: {
      learner_id: 'a5d',
      content_id: 'a97',
      status: STATUSES.started,
      last_activity: new Date('2019-05-05T08:13:22Z'),
      time_spent: 17.14,
    },
  },
];

const initWrapper = propsData => {
  return mount(ReportsExerciseLearners, {
    propsData,
    stubs: ['router-link'],
  });
};

const getCol = (row, colIndex) => {
  return row.findAll('td').at(colIndex);
};

describe('ReportsExerciseLearners', () => {
  it('smoke test', () => {
    const wrapper = shallowMount(ReportsExerciseLearners);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  it('renders all entries', () => {
    const wrapper = initWrapper({
      entries,
    });

    const rows = wrapper.findAll({ ref: 'entry' });
    expect(rows.length).toBe(2);

    const firstRow = rows.at(0);
    const secondRow = rows.at(1);

    expect(getCol(firstRow, 0).html()).toContain('learner1');
    expect(getCol(firstRow, 1).html()).toContain(STATUSES.completed);
    expect(getCol(firstRow, 2).html()).toContain('92 seconds');
    expect(getCol(firstRow, 3).html()).toContain('group1, group2');
    expect(getCol(firstRow, 4).html()).toContain(' hours ago');

    expect(getCol(secondRow, 0).html()).toContain('learner2');
    expect(getCol(secondRow, 1).html()).toContain(STATUSES.started);
    expect(getCol(secondRow, 2).html()).toContain('17 seconds');
    expect(getCol(secondRow, 3).html()).toContain('group2');
    expect(getCol(secondRow, 4).html()).toContain(' hours ago');
  });

  it("doesn't render groups information when show groups set to false", () => {
    const wrapper = initWrapper({
      entries,
      showGroupsColumn: false,
    });

    expect(wrapper.html()).not.toContain('Groups');
    expect(wrapper.html()).not.toContain('group1');
    expect(wrapper.html()).not.toContain('group2');
  });

  describe('when an exercise has started', () => {
    let row;

    beforeAll(() => {
      const wrapper = initWrapper({
        entries: [
          {
            name: 'learner1',
            groups: [],
            exerciseLink: '#/2e3/reports/lessons/79b/exercises/a97/learners/d4b',
            statusObj: {
              status: STATUSES.completed,
              last_activity: new Date('2019-05-05T08:13:22Z'),
              time_spent: 17.14,
            },
          },
        ],
      });

      row = wrapper.find({ ref: 'entry' });
    });

    it("renders learner's name as a link to an exercise", () => {
      expect(getCol(row, 0).html()).toContain('router-link');
      expect(
        getCol(row, 0)
          .find('router-link-stub')
          .attributes().to
      ).toBe('#/2e3/reports/lessons/79b/exercises/a97/learners/d4b');
    });

    it('renders time spent', () => {
      expect(getCol(row, 2).text()).toBe('17 seconds');
    });

    it('renders last activity time', () => {
      expect(getCol(row, 4).text()).toContain(' hours ago');
    });
  });

  describe('when an exercise has not yet started', () => {
    let row;

    beforeAll(() => {
      const wrapper = initWrapper({
        entries: [
          {
            name: 'learner1',
            groups: [],
            exerciseLink: '#/2e3/reports/lessons/79b/exercises/a97/learners/d4b',
            statusObj: {
              status: STATUSES.notStarted,
            },
          },
        ],
      });

      row = wrapper.find({ ref: 'entry' });
    });

    it("renders learner's name as a plain value", () => {
      expect(getCol(row, 0).text()).toBe('learner1');
      expect(getCol(row, 0).html()).not.toContain('router-link');
    });

    it("doesn't render time spent", () => {
      expect(getCol(row, 2).text()).toBe('—');
    });

    it('renders last activity time', () => {
      expect(getCol(row, 4).text()).toBe('—');
    });
  });
});

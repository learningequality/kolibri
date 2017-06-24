/* eslint-env mocha */
import Vue from 'vue-test';
import assert from 'assert';
import ExamReportPage from '../../src/views/exam-report-page';

function makeVm(options = {}) {
  const Ctor = Vue.extend(ExamReportPage);
  const components = {
    'router-link': '<div></div>',
  };
  return new Ctor(Object.assign(options, { components })).$mount();
}

function getElements(vm) {
  return {
    headerStats: () => vm.$el.querySelectorAll('.header h1'),
    tableRows: () => vm.$el.querySelectorAll('tbody > tr'),
  };
}

function getTextInScoreColumn(tdEl) {
  // in the second column
  return tdEl.querySelectorAll('td')[1].innerText;
}

describe('exam report page', () => {
  it('average score is not shown if no exams in progress', () => {
    const vm = makeVm({
      vuex: {
        getters: {
          examTakers: () => [
            { progress: undefined, group: {}, score: undefined },
            { progress: undefined, group: {}, score: undefined },
          ],
          classId: () => 'class_1',
          exam: () => ({ question_count: 6 }),
          channelId: () => 'channel_1',
        }
      }
    });
    const els = getElements(vm);
    assert.equal(els.headerStats().length, 1);
  });

  it('average score is shown if at least one exam in progress', () => {
    const vm = makeVm({
      vuex: {
        getters: {
          examTakers: () => [
            { progress: 6, group: {}, score: 3 },
            { progress: 6, group: {}, score: 3 },
            { progress: undefined, group: {}, score: undefined },
          ],
          classId: () => 'class_1',
          exam: () => ({ question_count: 6 }),
          channelId: () => 'channel_1',
        }
      }
    });
    const els = getElements(vm);
    assert.equal(els.headerStats().length, 2);
    // h1 text doesn't get formatted, so inspecting vm.averageScore directly
    assert.equal(vm.averageScore, 0.5);
  });

  it('shows correct scores for exam takers', () => {
    const vm = makeVm({
      vuex: {
        getters: {
          examTakers: () => [
            { progress: 6, group: {}, score: 3 },
            { progress: undefined, group: {}, score: undefined },
          ],
          classId: () => 'class_1',
          exam: () => ({ question_count: 6 }),
          channelId: () => 'channel_1',
        }
      }
    });
    const els = getElements(vm);
    // score is properly formatted
    assert.equal(getTextInScoreColumn(els.tableRows()[0]).trim(), '50%');
    // emdash
    assert.equal(getTextInScoreColumn(els.tableRows()[1]).trim(), '–');
  });
});

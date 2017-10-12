/* eslint-env mocha */
import Vue from 'vue-test';
import Vuex from 'vuex';
import assert from 'assert';
import ExamReportPage from '../../src/views/exam-report-page';
import { shallow } from 'avoriaz';

function makeWrapper(options = {}) {
  const components = {
    'router-link': '<div></div>',
  };
  return shallow(ExamReportPage, Object.assign(options, { components }));
}

function getElements(wrapper) {
  return {
    averageScore: () => wrapper.find('.header h1:nth-child(2)')[0],
    tableRows: () => wrapper.find('tbody > tr'),
    takenBy: () => wrapper.find('.header h1:nth-child(1)')[0],
  };
}

function getTextInScoreColumn(tdEl) {
  // in the second column
  return tdEl.find('td')[1].text();
}

const initialState = () => ({
  classId: 'class_1',
  pageState: {
    channelId: 'channel_1',
    examTakers: [],
    exam: {
      question_count: 6,
    },
  },
});

describe('exam report page', () => {
  it('average score is not shown if no exams are in progress', () => {
    const state = initialState();
    state.pageState.examTakers = [
      { progress: undefined, group: {}, score: undefined },
      { progress: undefined, group: {}, score: undefined },
    ];
    const wrapper = makeWrapper({ store: new Vuex.Store({ state }) });
    const { takenBy, averageScore } = getElements(wrapper);
    assert.equal(
      takenBy()
        .text()
        .trim(),
      'Exam taken by: 0 learners'
    );
    assert(averageScore() === undefined);
  });

  it('average score is shown if at least one exam in progress', () => {
    const state = initialState();
    state.pageState.examTakers = [
      { progress: 6, group: {}, score: 3 },
      { progress: 6, group: {}, score: 3 },
      { progress: undefined, group: {}, score: undefined },
    ];
    const wrapper = makeWrapper({ store: new Vuex.Store({ state }) });
    const { averageScore, takenBy } = getElements(wrapper);
    assert.equal(
      takenBy()
        .text()
        .trim(),
      'Exam taken by: 2 learners'
    );
    assert.equal(
      averageScore()
        .text()
        .trim(),
      'Average Score: 50%'
    );
  });

  it('shows correct scores for exam takers', () => {
    const state = initialState();
    state.pageState.examTakers = [
      { progress: 6, group: {}, score: 3 },
      { progress: undefined, group: {}, score: undefined },
    ];
    const wrapper = makeWrapper({ store: new Vuex.Store({ state }) });
    const { tableRows } = getElements(wrapper);
    // score is properly formatted
    assert.equal(getTextInScoreColumn(tableRows()[0]).trim(), '50%');
    // emdash
    assert.equal(getTextInScoreColumn(tableRows()[1]).trim(), '–');
  });
});

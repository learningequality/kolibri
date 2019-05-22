import Vuex from 'vuex';
import summaryModule from '../index';

import sampleState from './sampleState2';

describe('coach summary data helpers', () => {
  summaryModule.state = sampleState;
  const store = new Vuex.Store(summaryModule);
  describe('getGroupNames', () => {
    it('returns the names of groups given a list of group IDs', () => {
      expect(store.getters.getGroupNames(['group_id_1', 'group_id_3'])).toEqual([
        'Group 1',
        'Group 3',
      ]);
    });
  });
  describe('getGroupNamesForLearner', () => {
    it('returns the names of groups given a learner ID', () => {
      expect(store.getters.getGroupNamesForLearner('learner_id_5')).toEqual(['Group 2', 'Group 3']);
      expect(store.getters.getGroupNamesForLearner('learner_id_4')).toEqual(['Group 4']);
    });
  });
  describe('getLearnersForGroups', () => {
    it('returns everyone in the class when empty', () => {
      expect(store.getters.getLearnersForGroups([])).toEqual(
        store.getters.learners.map(learner => learner.id)
      );
    });
    it('returns the learner IDs of everyone in the groups with no duplicates', () => {
      const output = store.getters.getLearnersForGroups(['group_id_2', 'group_id_3']);
      output.sort();
      expect(output).toEqual([
        'learner_id_1',
        'learner_id_11',
        'learner_id_2',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
    });
  });
  describe('getLearnersForExam', () => {
    it('returns empty when exam has no assignments', () => {
      expect(
        store.getters.getLearnersForExam({
          assignments: [],
        })
      ).toEqual([]);
    });

    it('passes through to getLearnersForGroups when exam has assignments', () => {
      const groups = ['group_id_2', 'group_id_3'];
      const output = store.getters.getLearnersForExam({
        assignments: groups,
        groups,
      });
      output.sort();
      expect(output).toEqual([
        'learner_id_1',
        'learner_id_11',
        'learner_id_2',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
    });
  });
  describe('getLearnersForLesson', () => {
    it('returns empty when lesson has no assignments', () => {
      expect(
        store.getters.getLearnersForLesson({
          assignments: [],
        })
      ).toEqual([]);
    });

    it('passes through to getLearnersForGroups when lesson has assignments', () => {
      const groups = ['group_id_2', 'group_id_3'];
      const output = store.getters.getLearnersForLesson({
        assignments: groups,
        groups,
      });
      output.sort();
      expect(output).toEqual([
        'learner_id_1',
        'learner_id_11',
        'learner_id_2',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
    });
  });
  describe('getContentStatusObjForLearner', () => {
    it('returns a recorded status object given a content ID and learner ID', () => {
      expect(store.getters.getContentStatusObjForLearner('content_Q', 'learner_id_1')).toEqual({
        content_id: 'content_Q',
        last_activity: new Date('2019-01-24T22:41:29.288Z'),
        learner_id: 'learner_id_1',
        status: 'Completed',
        time_spent: 10,
      });
      expect(store.getters.getContentStatusObjForLearner('content_Q', 'learner_id_2')).toEqual({
        content_id: 'content_Q',
        last_activity: new Date('2019-01-24T21:34:36.130Z'),
        learner_id: 'learner_id_2',
        status: 'Started',
        time_spent: 5,
      });
      expect(store.getters.getContentStatusObjForLearner('content_Q', 'learner_id_3')).toEqual({
        content_id: 'content_Q',
        last_activity: new Date('2019-01-24T20:41:29.288Z'),
        learner_id: 'learner_id_3',
        status: 'NotStarted',
        time_spent: 0,
      });
      expect(store.getters.getContentStatusObjForLearner('content_Q', 'learner_id_4')).toEqual({
        content_id: 'content_Q',
        last_activity: new Date('2019-01-24T19:34:36.130Z'),
        learner_id: 'learner_id_4',
        status: 'HelpNeeded',
        time_spent: 0,
      });
    });
    it('returns a dummy "NotStarted" status object when passed unknown information', () => {
      expect(store.getters.getContentStatusObjForLearner('content_Q', 'learner_id_7')).toEqual({
        status: 'NotStarted',
      });
      expect(store.getters.getContentStatusObjForLearner('XXXX', 'learner_id_5')).toEqual({
        status: 'NotStarted',
      });
      expect(store.getters.getContentStatusObjForLearner('learner_id_5', 'XXXX')).toEqual({
        status: 'NotStarted',
      });
      expect(store.getters.getContentStatusObjForLearner('XXXX', 'XXXX')).toEqual({
        status: 'NotStarted',
      });
    });
  });
  describe('getContentStatusTally', () => {
    it('returns total statuses given a content item and a list of learners', () => {
      const output = store.getters.getContentStatusTally('content_Q', [
        'learner_id_1',
        'learner_id_2',
        'learner_id_3',
        'learner_id_4',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
      expect(output).toEqual({
        completed: 2,
        started: 2,
        notStarted: 4,
        helpNeeded: 1,
      });
    });
  });
  describe('getLessonStatusTally', () => {
    it('returns total statuses given a lesson item and a list of learners', () => {
      const output = store.getters.getLessonStatusTally('lesson_id_2', [
        'learner_id_1',
        'learner_id_3',
        'learner_id_6',
      ]);
      expect(output).toEqual({
        completed: 1,
        started: 1,
        notStarted: 1,
        helpNeeded: 0,
      });
    });
  });
  describe('getContentAvgTimeSpent', () => {
    it('returns average time a list of learners has worked on an item, omitting not started', () => {
      const output = store.getters.getContentAvgTimeSpent('content_Q', [
        'learner_id_1',
        'learner_id_2',
        'learner_id_3',
        'learner_id_4',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
      expect(output).toBeCloseTo(7.3, 5);
    });
  });
  describe('getExamAvgScore', () => {
    it('returns average exam score for a list of learners, only for completed exams', () => {
      const output = store.getters.getExamAvgScore('exam_id_2', [
        'learner_id_1',
        'learner_id_2',
        'learner_id_3',
        'learner_id_4',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
      expect(output).toBeCloseTo(0.75, 5);
    });
  });
  describe('getExamStatusTally', () => {
    it('returns total statuses given an exam item and a list of learners', () => {
      const output = store.getters.getExamStatusTally('exam_id_2', [
        'learner_id_1',
        'learner_id_2',
        'learner_id_3',
        'learner_id_4',
        'learner_id_5',
        'learner_id_6',
        'learner_id_7',
        'learner_id_8',
        'learner_id_9',
      ]);
      expect(output).toEqual({
        completed: 2,
        started: 1,
        notStarted: 6,
        helpNeeded: 0,
      });
    });
  });
});

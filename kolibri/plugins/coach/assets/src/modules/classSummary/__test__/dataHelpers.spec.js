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
  describe('getContentStatusForLearner', () => {
    it('returns a recorded status string given a content ID and learner ID', () => {
      expect(store.getters.getContentStatusForLearner('content_Q', 'learner_id_1')).toEqual(
        'Completed'
      );
      expect(store.getters.getContentStatusForLearner('content_Q', 'learner_id_2')).toEqual(
        'Started'
      );
      expect(store.getters.getContentStatusForLearner('content_Q', 'learner_id_3')).toEqual(
        'NotStarted'
      );
      expect(store.getters.getContentStatusForLearner('content_Q', 'learner_id_4')).toEqual(
        'HelpNeeded'
      );
    });
    it('returns "NotStarted" when passed unknown information', () => {
      expect(store.getters.getContentStatusForLearner('content_Q', 'learner_id_7')).toEqual(
        'NotStarted'
      );
      expect(store.getters.getContentStatusForLearner('XXXX', 'learner_id_5')).toEqual(
        'NotStarted'
      );
      expect(store.getters.getContentStatusForLearner('learner_id_5', 'XXXX')).toEqual(
        'NotStarted'
      );
      expect(store.getters.getContentStatusForLearner('XXXX', 'XXXX')).toEqual('NotStarted');
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
});

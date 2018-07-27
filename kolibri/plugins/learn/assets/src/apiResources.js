import { Resource } from 'kolibri.lib.apiResource';

/**
 * Gets all of the Classrooms in which a Learner is enrolled
 *
 * To get Classrooms without assignments and progress:
 * LearnerClassroomResource.getCollection({ no_assignments: true }).fetch()
 */
export const LearnerClassroomResource = new Resource({
  name: 'kolibri:learnplugin:learnerclassroom',
});

/**
 * Gets Lesson(s) that are assigned to the Learner
 */
export const LearnerLessonResource = new Resource({
  name: 'kolibri:learnplugin:learnerlesson',
});

import { Resource } from 'kolibri.lib.apiResource';

/**
 * Gets all of the Classrooms in which a Learner is enrolled
 *
 * To get Classrooms without assignments and progress:
 * LearnerClassroomResource.getCollection({ no_assignments: true }).fetch()
 */
class LearnerClassroom extends Resource {
  static resourceName() {
    return 'kolibri:learnplugin:learnerclassroom';
  }
}

/**
 * Gets Lesson(s) that are assigned to the Learner
 */
class LearnerLesson extends Resource {
  static resourceName() {
    return 'kolibri:learnplugin:learnerlesson';
  }
}

export const LearnerClassroomResource = new LearnerClassroom();
export const LearnerLessonResource = new LearnerLesson();

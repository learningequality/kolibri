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

export const LearnerClassroomResource = new LearnerClassroom();

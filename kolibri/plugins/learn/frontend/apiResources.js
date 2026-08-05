import { Resource } from 'kolibri/apiResource';

/**
 * Gets all of the Classrooms in which a Learner is enrolled.
 * @example To get Classrooms without assignments and progress:
 * LearnerClassroomResource.list({ no_assignments: true })
 */
export const LearnerClassroomResource = new Resource({
  name: 'learnerclassroom',
  namespace: 'kolibri.plugins.learn',
});

/**
 * Gets Lesson(s) that are assigned to the Learner
 */
export const LearnerLessonResource = new Resource({
  name: 'learnerlesson',
  namespace: 'kolibri.plugins.learn',
});

export const LearnerCourseResource = new Resource({
  name: 'learnercourse',
  namespace: 'kolibri.plugins.learn',
  async getResumeData(id) {
    const response = await this.request({ action: 'resume', routeParams: id });
    return response.data;
  },
});

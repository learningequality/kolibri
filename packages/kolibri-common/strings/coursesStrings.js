import { createTranslator } from 'kolibri/utils/i18n';

export const coursesStrings = createTranslator('CoursesStrings', {
  courseLabel: {
    message: 'Course',
    context: 'Label for a single course that contains units and lessons.',
  },
  coursesLabel: {
    message: 'Courses',
    context: 'Label for courses that contain units and lessons.',
  },
  assignCourseAction: {
    message: 'Assign course',
    context: 'Action label for assigning a course to learners.',
  },
  selectCourseLabel: {
    message: 'Select course to assign',
    context: 'Label for selecting a course to assign to learners.',
  },
  selectRecipientsLabel: {
    message: 'Select recipients',
    context: 'Action label for selecting recipients when assigning a course.',
  },
  courseNameLabel: {
    message: 'Course: {name}',
    context: 'Label for the name of a course.',
  },
  selectedLearnersLabel: {
    message: 'Selected learners',
    context: 'Label for the list of selected learners when assigning a course.',
  },
  courseIsAssignedTitle: {
    message: 'Course is assigned!',
    context: 'Title for the modal that confirms a course has been assigned.',
  },
  courseIsAssignedMessage: {
    message:
      'Learners in the assigned group will take a pre-test before starting this course. You can adjust assessment availability in the course settings.',
    context: 'Message for the modal that confirms a course has been assigned.',
  },
});

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
  noCoursesAssigned: {
    message: 'You do not have any courses assigned',
    context: 'Text displayed when there are no courses assigned to the classroom',
  },
  emptyCoursesDescription: {
    message: 'Get started by assigning a course to your learners',
    context: 'Description shown when no courses have been assigned to the class',
  },
  masteryLabel: {
    message: 'Mastery',
    context: 'Column header for average mastery percentage',
  },
  visibleLabel: {
    message: 'Visible',
    context: 'Column header for the visibility toggle',
  },
  courseNotAvailable: {
    message: 'Course not available',
    context: 'Text shown when the course content is not available on the device',
  },
  contentNotAvailable: {
    message: 'Content not available',
    context: 'Status message when course content is missing from the device',
  },
  courseVisibleToLearnersMessage: {
    message: 'Course is now visible to learners',
    context: 'Snackbar message when a course is made visible',
  },
  courseNotVisibleToLearnersMessage: {
    message: 'Course is now hidden from learners',
    context: 'Snackbar message when a course is made not visible',
  },
  courseUpdateError: {
    message: 'There was an error updating the course',
    context: 'Error message when course update fails',
  },
  courseDeleteError: {
    message: 'There was an error deleting the course assignment',
    context: 'Error message shown when a course assignment could not be removed',
  },
  courseDeleted: {
    message: 'Course assignment deleted',
    context: 'Snackbar message when a course has been deleted',
  },
  deleteCourseConfirmation: {
    message: 'Delete course assignment "{title}"?',
    context: 'Confirmation prompt for deleting a course assignment from a class',
  },
  deleteCourseTitle: {
    message: 'Delete course assignment',
    context: 'Title for the modal that confirms course assignment deletion',
  },
  filterCourseStatus: {
    message: 'status',
    context: 'Label for filter dropdown to filter courses by visibility status',
  },
  filterCourseVisible: {
    message: 'Visible courses',
    context: 'Filter option to show only visible courses',
  },
  filterCourseNotVisible: {
    message: 'Not visible courses',
    context: 'Filter option to show only hidden courses',
  },
  clearAllFilters: {
    message: 'Clear all',
    context: 'Button text to clear all filter selections',
  },
  openSidePanelLabel: {
    message: 'Open side panel',
    context: 'Aria label for button that opens the side panel in course content view.',
  },
  closeSidePanelLabel: {
    message: 'Close side panel',
    context: 'Aria label for button that closes the side panel in course content view.',
  },
  previousLabel: {
    message: 'Previous',
    context: 'Button label for navigating to the previous item in a sequence.',
  },
  nextLabel: {
    message: 'Next',
    context: 'Button label for navigating to the next item in a sequence.',
  },
  numQuestions: {
    message: '{num, number} {num, plural, one {question} other {questions}}',
    context: 'Part of course details on the heading for each unit showing how much is inside',
  },
  numLessons: {
    message: '{num, number} {num, plural, one {lesson} other {lessons}}',
    context: 'Part of course details on the heading for each unit showing how much is inside',
  },
  numUnits: {
    message: '{num, number} {num, plural, one {unit} other {units}}',
    context: 'Part of subtitle shown under the course title',
  },
  courseContentLabel: {
    message: 'Course content',
    context: 'Label above list of units in course contents listing',
  },
  preTestLabel: {
    message: 'Pre-test',
    context: "Label shown as name of the pre-test in a unit's resource listing",
  },
  postTestLabel: {
    message: 'Post-test',
    context: "Label shown as name of the post-test in a unit's resource listing",
  },
  resourcesProgressLabel: {
    message:
      '{current, number} of {total, number} { total, plural, one {resource} other {resources} }',
    context:
      'Label showing the number of the current resource out of the total number of resources available.',
  },
});

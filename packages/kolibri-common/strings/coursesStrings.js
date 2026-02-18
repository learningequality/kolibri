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
  learningObjectivesLabel: {
    message: 'Learning objectives',
    context: 'Label for tab to show learning objectives on course summary page',
  },
  unitsLabel: {
    message: 'Units',
    context: 'Label for tab that shows units on course summary page',
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
  visibleToLearnersLabel: {
    message: 'Visible to learners',
    context: 'Label for toggle switch to make course visible (or not)',
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
  startCourseAction: {
    message: 'Start Course',
    context: 'Action label for button to start a course',
  },
  resumeCourseAction: {
    message: 'Resume Course',
    context: 'Action label for button to resume a course',
  },
  unitNumberLabel: {
    message: 'Unit {number}',
    context: 'Label for the unit number shown in the course unit view',
  },
  currentLabel: {
    message: 'Current',
    context: 'Label for the current lesson in the course unit view',
  },
  upNextLabel: {
    message: 'Up next',
    context: 'Label for the next unit in the course unit view',
  },
  markAsCompleteAction: {
    message: 'Mark as complete',
    context: 'Action label for marking a resource as complete',
  startPreTest: {
    message: 'Start pre-test',
    context: 'Button label for starting a pre-test',
  },
  endPreTest: {
    message: 'End pre-test',
    context: 'Button label for ending a pre-test',
  },
  endPostTest: {
    message: 'End post-test',
    context: 'Button label for ending a post-test',
  },
  startPostTest: {
    message: 'Start post-test',
    context: 'Button label for starting a post-test',
  },
  readyToStartLabel: {
    message: 'ready to start',
    context: 'Added to indicate a status of a pre/post test being ready to start',
  },
  completedUnitsLabel: {
    message: 'Completed units',
    context: 'Label for folding accordion title to list/hide units that have been completed',
  },
  upcomingUnitsLabel: {
    message: 'Upcoming units',
    context: 'Label for folding accordion title to list/hide units that have not yet been started',
  },
  lockedLabel: {
    message: 'Locked',
    context: 'Label for a unit that is upcoming and cannot be started',
  },
  unitNLabel: {
    message: 'Unit {num, number}:',
    context: 'Added to the beginning of the unit title to indicate which unit it is in order',
  },
  startPreTestForUnitConfirmation: {
    message: 'Start pre-test for unit {num, number}?',
    context: 'Heading for confirmation modal when user clicks to activate a pre-test',
  },
  startPostTestForUnitConfirmation: {
    message: 'Start post-test for unit {num, number}?',
    context: 'Heading for confirmation modal when user clicks to activate a post-test',
  },
  endPostTestForUnitConfirmation: {
    message: 'End post-test for unit {num, number}?',
    context: 'Heading for confirmation modal when user clicks to end a post-test',
  },
  startTestForUnitDescription: {
    message:
      'All assigned learners can now start the test. You can end the test whenever you want.',
    context: 'Description text on modal confirming start of pre-test or post-test',
  },
  endTestForUnitDescription: {
    message:
      "This action cannot be undone. Learners who haven't completed the test will be marked as incomplete.",
    context: 'Description text on modal confirming ending of pre-test or post-test',
  },
  endPreTestForUnitConfirmation: {
    message: 'End pre-test for unit {num, number}?',
    context: 'Heading for confirmation modal when user clicks to end a pre-test',
  },
  keepRunning: {
    message: 'Keep test running',
    context: 'Label for button that cancels modal for ending test',
  },
  nOfMLearners: {
    message: '{n, number} of {m, number} learners',
    context: 'First part of label to be followed by a label "completed"',
  },
  workingOnLessons: {
    message: 'working on lessons',
    context: 'Placed after message "n of m learners" - separated like this for styling',
  },
  activeUnit: {
    message: 'Active unit',
    context: 'Label for an information flag in the area of the currently active unit',
  },
  dateAssigned: {
    message: 'Date assigned',
    context: 'Label in course summary showing how long it has been since the course was assigned',
  },
  courseVisible: {
    message: 'Course visible to learners',
    context: 'Snackbar message after user toggles course to be visible',
  },
  courseNotVisible: {
    message: 'Course not visible to learners',
    context: 'Snackbar message after user toggles course to be hidden',
  },
  preTestEndedForUnit: {
    message: 'Pre-test ended for {title}',
    context: 'Snackbar message upon ending the pre-test',
  },
  postTestEndedForUnit: {
    message: 'Post-test ended for {title}',
    context: 'Snackbar message upon ending the post-test',
  },
  preTestStartedForUnit: {
    message: 'Pre-test started for {title}',
    context: 'Snackbar message upon starting the pre-test',
  },
  postTestStartedForUnit: {
    message: 'Post-test started for {title}',
    context: 'Snackbar message upon starting the post-test',
  },
  numLearners: {
    message: '{num, number} {num, plural, one {learner} other {learners}}',
    context: 'Label showing a number of learners',
  },
});

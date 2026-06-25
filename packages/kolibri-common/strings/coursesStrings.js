import { createTranslator } from 'kolibri/utils/i18n';

export const coursesStrings = createTranslator('CoursesStrings', {
  courseLabel: {
    message: 'Course',
    context: 'Label for a single course that contains units and lessons.',
  },
  courseLessonCount: {
    message: '{count, number} {count, plural, one {lesson} other {lessons}}',
    context: 'Displays the number of lessons in a course, shown on course cards.',
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
  preTestTitle: {
    message: 'Unit {unitNumber, number}: {unitTitle} - Pre-test',
    context: 'Label for the pre-test of a unit.',
  },
  postTestTitle: {
    message: 'Unit {unitNumber, number}: {unitTitle} - Post-test',
    context: 'Label for the post-test of a unit.',
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
  recentCoursesHeader: {
    message: 'Recent courses',
    context:
      "Section header on the learner's Home page, displaying the most recent courses that the coaches assigned to them.",
  },
  yourCoursesHeader: {
    message: 'Your courses',
    context:
      "Heading on the 'Learn > Home' page for a section where a learner can see which courses have been assigned to them.",
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
  courseAssignDeletedUsersError: {
    message:
      'There was a problem saving this course. One or more selected users no longer exist in this facility. Please refresh the page and try again.',
    context:
      'Error message shown when assigning a course fails because one or more selected individual learners have been deleted from the facility.',
  },
  courseDeleted: {
    message: 'Course deleted',
    context: 'Snackbar message when a course has been deleted',
  },
  courseDeleteError: {
    message: 'There was an error deleting the course',
    context: 'Error message shown when a course could not be removed',
  },
  deleteCourseConfirmation: {
    message: 'Delete course assignment "{title}"?',
    context: 'Confirmation prompt for deleting a course assignment from a class',
  },
  deleteCourseTitle: {
    message: 'Delete course assignment',
    context: 'Title for the modal that confirms course assignment deletion',
  },
  deleteCourseFromSummaryTitle: {
    message: 'Delete course',
    context: 'Title for the confirmation modal when deleting a course from the course detail page',
  },
  deleteCourseFromSummaryConfirmation: {
    message:
      'Are you sure you want to delete this course? Learners will no longer be able to access the course and their progress, including your access to coach reports, will be deleted.',
    context: 'Confirmation message when deleting a course from the course detail page',
  },
  filterCourseStatus: {
    message: 'Status',
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
  numResources: {
    message: '{num, number} {num, plural, one {resource} other {resources}}',
    context: 'Part of course details on the heading for each lesson showing how many resources',
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
  },
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
  nOfMLearnersWorkingOnLessons: {
    message: '{n, number} of {m, number} learners working on lessons',
    context:
      'Indicates how many learners are currently working on lessons in a unit out of the total number of learners assigned',
  },
  nOfMLearnersCompleted: {
    message: '{n, number} of {m, number} learners completed',
    context:
      'indicates how many learners have completed a unit or course out of the total number of learners assigned',
  },
  activeUnit: {
    message: 'Active unit',
    context: 'Label for an information flag in the area of the currently active unit',
  },
  dateAssigned: {
    message: 'Date assigned',
    context: 'Label in course summary showing how long it has been since the course was assigned',
  },
  setCourseVisibilityLabel: {
    message: 'Set course visibility',
    context: 'Aria label for the toggle switch to set course visibility, read by screen readers',
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
  practiceAction: {
    message: 'Practice',
    context: 'Action label for practicing an assessment that has already been completed',
  },
  nextResourceLabel: {
    message: 'Next resource',
    context: 'Action label for navigating to the next resource in a course unit',
  },
  previousResourceLabel: {
    message: 'Previous resource',
    context: 'Action label for navigating to the previous resource in a course unit',
  },
  courseDetailsAction: {
    message: 'Course details',
    context: 'Action label to view course details',
  },
  editRecipientsAction: {
    message: 'Edit recipients',
    context: 'Action label for editing which learners are assigned to a course.',
  },
  sparklineDistributionLabel: {
    message: '{lowCount, number} low, {midCount, number} medium, {highCount, number} high',
    context:
      'Visually hidden accessibility label for the sparkline bar, summarising the distribution of learners across low, medium, and high performance bands.',
  },
  learnersByMasteryLabel: {
    message: 'Learners by mastery',
    context: 'Tooltip title for the sparkline bar showing learner distribution by mastery level',
  },
  lowCountLabel: {
    message: '{count, number} low',
    context: 'Tooltip row showing the number of learners with low mastery',
  },
  partialCountLabel: {
    message: '{count, number} partial',
    context: 'Tooltip row showing the number of learners with partial mastery',
  },
  strongCountLabel: {
    message: '{count, number} strong',
    context: 'Tooltip row showing the number of learners with strong mastery',
  },
  clickToViewDetailsLabel: {
    message: 'Click to view details',
    context: 'Tooltip prompt inviting the user to click the sparkline bar for more detail',
  },
  preTestCompleted: {
    message: 'Pre-test completed!',
    context: 'Snackbar message when a pre-test is completed',
  },
  postTestCompleted: {
    message: 'Post-test completed!',
    context: 'Snackbar message when a post-test is completed',
  },
  preTestCompletedDescription: {
    message: 'You will be able to continue once your coach closes this pre-test.',
    context: 'Description text shown when a pre-test is completed',
  },
  postTestCompletedDescription: {
    message: 'You will be able to continue once your coach closes this post-test.',
    context: 'Description text shown when a post-test is completed',
  },
  unitCompleted: {
    message: 'Unit completed!',
    context: 'Interstitial heading shown when a learner finishes all resources in a course unit',
  },
  unitCompletedDescription: {
    message:
      'You have completed all resources in this unit. You may review resources until the next unit is opened.',
    context:
      'Interstitial description shown when a learner finishes all resources in a course unit',
  },
  submitTestAction: {
    message: 'Submit test',
    context: 'Action label for button to submit a pre-test or post-test.',
  },
  unitTitleWithStatus: {
    message: '{title} ({status})',
    context:
      'Accordion header for a unit that shows the unit title with its test status in parentheses, e.g. "Unit 1: Letters (Pre-test results)"',
  },
  noTestDataLabel: {
    message: 'No test has been activated for this unit yet',
    context:
      'Empty state message shown in the learning objectives report when no test has been activated for the unit',
  },
  preTestInProgress: {
    message: 'Pre-test in progress',
    context:
      'Label shown in the accordion header when the pre-test is currently active and learners are still taking it',
  },
  preTestResults: {
    message: 'Pre-test results',
    context:
      'Label shown in the accordion header when the pre-test is closed and results are available',
  },
  postTestInProgress: {
    message: 'Post-test in progress',
    context:
      'Label shown in the accordion header when the post-test is currently active and learners are still taking it',
  },
  postTestResults: {
    message: 'Post-test results',
    context:
      'Label shown in the accordion header when the post-test is closed and results are available',
  },
  supportNeededLabel: {
    message: 'Support needed',
    context:
      'Risk level badge shown in the Learners report for learners whose aggregate score is ≤45%',
  },
  gainingMomentumLabel: {
    message: 'Gaining momentum',
    context:
      'Risk level badge shown in the Learners report for learners whose aggregate score is 46–60%',
  },
  onTrackLabel: {
    message: 'On track',
    context:
      'Risk level badge shown in the Learners report for learners whose aggregate score is above 60%',
  },
  unitProgressLabel: {
    message: 'Unit progress',
    context: 'Column header for the unit progress indicator in the Learners report table',
  },
  noLearnersAttemptedLabel: {
    message: 'No learners have attempted this test yet',
    context:
      'Empty state message in the Learners report when a test is active but no learner has submitted answers',
  },
  learnerReportLabel: {
    message: 'Learner report',
    context: 'Subtitle in the learner side panel header, below the learner name',
  },
  noProgressLabel: {
    message: 'No progress yet',
    context: 'Heading in the learner side panel when the learner has not attempted any test',
  },
  hasntStartedUnitsLabel: {
    message: "{name} hasn't started any units",
    context:
      'Description in the learner side panel when the learner has not attempted any test. {name} is the learner name.',
  },
  strugglingWithObjectivesPrefixLabel: {
    message: 'Learner is struggling with',
    context:
      'Prefix of the warning banner in the learner side panel. Followed by a bold count and plural noun, e.g. "Learner is struggling with 3 learning objectives".',
  },
  strugglingWithObjectivesSuffixLabel: {
    message:
      '{count, number} {count, plural, one {learning objective} other {learning objectives}}',
    context:
      'Bold suffix of the warning banner showing the count and noun, e.g. "3 learning objectives". {count} is formatted as a locale-aware number.',
  },
  onTrackWithObjectivesPrefixLabel: {
    message: 'Learner on track with',
    context:
      'Prefix of the success banner in the learner side panel. Followed by a bold count and plural noun, e.g. "Learner on track with 2 learning objectives".',
  },
  onTrackWithObjectivesSuffixLabel: {
    message:
      '{count, number} {count, plural, one {learning objective} other {learning objectives}}',
    context:
      'Bold suffix of the success banner showing the count and noun, e.g. "2 learning objectives". {count} is formatted as a locale-aware number.',
  },
  xOfYCorrectLabel: {
    message: '{correct, number} of {total, number} correct',
    context:
      'Score label for each learning objective row in the learner side panel, e.g. "3 of 4 correct"',
  },
  progressLabel: {
    message: 'Progress',
    context: 'Label for the progress section in the learner side panel, displayed in uppercase',
  },
  individualLoPerformanceLabel: {
    message: 'Individual learning objective performance',
    context: 'Section heading in the learner side panel for the LO performance list',
  },
  sortedByScoreLowestFirstLabel: {
    message: 'Sorted by score (lowest first)',
    context: 'Sub-heading under the Individual learning objective performance section',
  },
  learningObjectiveLabel: {
    message: 'Learning objective',
    context: 'Column header in the learner side panel LO table',
  },
  questionsCorrectLabel: {
    message: 'Questions correct',
    context: 'Column header in the learner side panel LO table showing score for each LO',
  },
  ofNQuestionsLabel: {
    message: 'of {total, number}',
    context:
      'Part of the LO score display in the learner side panel, showing e.g. "of 5", preceded by a bold count number',
  },
  preTestAverageLabel: {
    message: 'Pre: {correct, number} of {total, number} questions',
    context:
      'Shows average pre-test score for a learning objective in the side panel, e.g. "Pre: 2 of 5 questions"',
  },
  postTestAverageLabel: {
    message: 'Post: {correct, number} of {total, number} questions',
    context:
      'Shows average post-test score for a learning objective in the side panel, e.g. "Post: 4 of 5 questions"',
  },
  learnersStrugglingLabel: {
    message:
      '{count, number} {count, plural, one {learner} other {learners}} struggling with this objective',
    context:
      'Warning banner in the learning objective side panel showing how many learners scored low',
  },
  correctOfTotalLabel: {
    message: '{correct, number} of {total, number}',
    context:
      'Score display for a learner on a specific objective, e.g. "3 of 5" meaning 3 correct out of 5',
  },
  testAveragesLabel: {
    message: 'Test averages',
    context: 'Label for the test averages row in the learning objective side panel summary',
  },
  individualPerformanceLabel: {
    message: 'Individual learning objective performance',
    context:
      'Section heading in the learning objective side panel above the per-learner score list',
  },
  sortedByScoreLabel: {
    message: 'Sorted by score (lowest first)',
    context:
      'Subtitle below the individual performance heading explaining the sort order of learner scores',
  },
  learnerProgressLabel: {
    message: 'Learner Progress',
    context: 'Column header for the learner progress tally on the Courses list page',
  },
  unitInProgressLabel: {
    message: 'Unit {num, number} in progress',
    context:
      'Status label on the Courses list page when learners are working on lessons between the pre- and post-tests; {num} is the 1-based unit number',
  },
  preTestRunningLabel: {
    message: 'Pre-test running · Unit {num, number}',
    context:
      'Status label on the Courses list page when a pre-test is active; {num} is the 1-based unit number',
  },
  postTestRunningLabel: {
    message: 'Post-test running · Unit {num, number}',
    context:
      'Status label on the Courses list page when a post-test is active; {num} is the 1-based unit number',
  },
  allCoursesForClass: {
    message: "All courses for class '{className}'",
    context: 'Accessible caption for the courses table, read by screen readers',
  },
});

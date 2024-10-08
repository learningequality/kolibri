import { createTranslator } from 'kolibri.utils.i18n';

const coachStrings = createTranslator('CommonCoachStrings', {
  // actions
  copyAction: {
    message: 'Copy',
    context:
      "Coaches can copy a lesson to a different group or another class using the 'Copy' option.",
  },
  createLessonAction: {
    message: 'Create new lesson',
    context: "Title of the 'Create new lesson' page.",
  },
  exportCSVAction: {
    message: 'Export as CSV',
    context:
      'An option available to coaches. They can export reports as CSV files if they want to keep a hard copy of the report.',
  },
  manageResourcesAction: {
    message: 'Manage resources',
    context:
      "When a coach creates a new lesson, they then add learning resources to that lesson.\n\nThey do this using the 'manage resources' button. Once in the  'manage resources' section, they can select select resources for the lesson from the channels available.",
  },
  newLessonAction: {
    message: 'New lesson',
    context:
      "In the Plan > Lessons section, coaches can create new lessons using the 'New lesson' button.",
  },
  newQuizAction: {
    message: 'New quiz',
    context:
      "In the Plan > Quizzes section, coaches can create new quizzes using the 'New quiz' button.",
  },
  previewAction: {
    message: 'Preview',
    context:
      'When coaches have finished selecting resources for a quiz, they can  preview the quiz to see what it looks like.',
  },
  printReportAction: {
    message: 'Print report',
    context: "Option to print a hard copy of a report in the 'Reports' tab.",
  },
  renameGroupAction: {
    message: 'Rename group',
    context: 'Label for dropdown menu button that allows user to rename a group',
  },
  enrollLearnersAction: {
    message: 'Enroll learners',
    context:
      'Label for dropdown menu button that navigates the coach to edit the enrollment for a group',
  },
  renameAction: {
    message: 'Rename',
    context: 'Generic option to change the name of some element such as a class name. ',
  },
  viewAllAction: {
    message: 'View all',
    context:
      'Option to view all elements that make up a class. For example, all quizzes or all lessons.',
  },

  // labels, phrases, titles, headers...
  activityLabel: {
    message: 'Activity',
    context:
      "'Activity' refers to the section in Kolobri which provides real time notifications of what's happening with the learners in a class.",
  },
  allQuizzesLabel: {
    message: 'All quizzes',
    context: 'Navigation link that takes coach back to the list of all the quizzes they manage.',
  },
  avgScoreLabel: {
    message: 'Average score',
    context:
      "The average score of a class's quiz results. This is calculated only from quizzes that were completed by learners.\n",
  },
  avgTimeSpentLabel: {
    message: 'Average time spent',
    context:
      "In the selected lesson 'Report' sub-tab, coaches can see the average time that has been spent on a resource by a specific class.",
  },
  backToLessonLabel: {
    message: "Back to '{lesson}'",
    context: 'Link that takes the coach back to the lesson view.',
  },
  classLabel: {
    message: 'Class',
    context:
      'A class is a group of enrolled learners and assigned coaches, created and managed by an admin.\n\nCoaches can assign lessons and quizzes to the learners in a class, and view reports of their progress and performance.',
  },
  classesLabel: {
    message: 'Classes',
    context:
      'A class is a group of enrolled learners and assigned coaches, created and managed by an admin.\n\nCoaches can assign lessons and quizzes to the learners in a class, and view reports of their progress and performance.',
  }, // Kept for use in common.js
  coachLabel: {
    message: 'Coach',
    context:
      'An account type that has the permission to manage lessons and quizzes within a class and track the progress and performance of learners enrolled in the class. We intentionally did not use the term "teacher" in order to be inclusive of non-formal education contexts.',
  }, // Kept here for use in common.js
  coachLabelWithOneName: {
    message: 'Coach – {name}',
    context:
      "Indicates the name of the coach who is assigned to a specific class. Only translate 'Coach'.",
  },
  coachLabelWithOneTwoNames: {
    message: 'Coach – {name1} – {name2}',
    context:
      "Indicates the names of the coaches who are assigned to a specific class if there are more than one. Only translate 'Coach'.",
  },
  descriptionLabel: {
    message: 'Description',
    context: 'Indicates a field where coaches can add a description to their lesson.',
  },
  descriptionMissingLabel: {
    message: 'No description',
    context: 'Indicates when a lesson does not have a description.',
  },
  generalInformationLabel: {
    message: 'General information',
    context:
      'Used as a visually hidden label for the section on quiz and lesson pages that contains general information about a lesson or a quizz',
  },
  detailsLabel: {
    message: 'Details',
    context:
      'Visually hidden label for the section that contains detailed interaction reports for each resource in the lesson or a quiz.',
  },
  difficultQuestionsLabel: {
    message: 'Difficult questions',
    context:
      "The 'Difficult questions' sub-tab within the 'Reports' section allows the coach to view a list of questions learners gave incorrect answers to, and gain insight of how many need help with the concept.",
  },
  entireClassLabel: {
    message: 'Entire class',
    context:
      "Coaches have the option to assign activities to groups, individual learners or the 'entire class' when they create a lesson.",
  },
  exercisesCompletedLabel: {
    message: 'Exercises completed',
    context:
      'Exercises are marked as completed when the learner has answered the required number of questions correctly in that specific exercise.',
  },
  filterLessonAll: {
    message: 'All',
    context:
      'Refers to LESSON. Default option in the selector used to filter and display lessons by status.',
  },
  filterLessonNotVisible: {
    message: 'Not visible',
    context:
      'Refers to LESSON. Option in the selector used to filter and display only the lessons not visible  to learners.',
  },
  filterLessonStatus: {
    message: 'Status',
    context: 'Label for the selector used to filter and display lessons by status.',
  },
  filterLessonVisible: {
    message: 'Visible',
    context:
      'Refers to LESSON. Option in the selector used to filter and display only the lessons visible to learners. ',
  },

  filterQuizAll: {
    message: 'All',
    context:
      'Refers to QUIZ. Default option in the selector used to filter and display quizes by status.',
  },
  filterQuizEnded: {
    message: 'Ended',
    context:
      'Refers to QUIZ. Option in the selector used to filter and display only the ended quizzes.',
  },
  filterQuizNotStarted: {
    message: 'Not started',
    context:
      'Refers to QUIZ. Option in the selector used to filter and display only the quizes not started. ',
  },
  filterQuizStarted: {
    message: 'Started',
    context:
      'Refers to QUIZ. Option in the selector used to filter and display only the started quizes. ',
  },
  filterQuizStatus: {
    message: 'Status',
    context: 'Label for the selector used to filter and display quizes by status.',
  },

  groupNameLabel: {
    message: 'Group name',
    context: "Displays on the 'Create new group' window when a coach creates a new group.",
  },
  groupsLabel: {
    message: 'Groups',
    context:
      'A group is a collection of learners created by a coach inside a class to help with differentiated learning. Quizzes and lessons can be assigned to individual groups as well as to the whole class.',
  },
  helpNeededLabel: {
    message: 'Help needed',
    context:
      "In the 'Difficult questions' sub-tab within the 'Reports' section, there's a column called 'Help needed' which shows the coach which learners need help on what questions.\n\nCoaches can also filter class activity by 'Help needed'",
  },
  lastActivityLabel: {
    message: 'Last activity',
    context: 'Indicates when a learner was last active on a particular resource.',
  },
  learnersLabel: {
    message: 'Learners',
    context:
      'Learner is an account type that has limited permissions. Learners can be enrolled in classes, get assigned resources through lessons and quizzes, and navigate channels directly. We intentionally did not use the term "student" to be more inclusive of non-formal educational contexts.',
  }, // Kept here for use in common.js
  lessonLabel: {
    message: 'Lesson',
    context:
      'A lesson is a linear learning pathway defined by a coach. The coach can select resources from any channel, add them to the lesson, define the ordering, and assign the lesson to learners in their class.',
  },
  lessonsLabel: {
    message: 'Lessons',
    context:
      'A lesson is a linear learning pathway defined by a coach. The coach can select resources from any channel, add them to the lesson, define the ordering, and assign the lesson to learners in their class.',
  }, // Kept here for use in common.js
  lessonsAssignedLabel: {
    message: 'Lessons assigned',
    context:
      'Indicates which lessons have been assigned to a learner or a group in the reports section.',
  },
  makeLessonVisibleTitle: {
    message: 'Make lesson visible',
    context: 'Informational prompt for coaches when updating lesson visibility to learners',
  },
  makeLessonNotVisibleTitle: {
    message: 'Make lesson not visible',
    context: 'Informational prompt for coaches when updating lesson visibility to learners',
  },
  makeLessonVisibleText: {
    message:
      'Learners will be able to see this lesson and use its resources. Resource files in this lesson will be downloaded to learn-only devices that are set up to sync with this server.',
    context: 'Informational prompt for coaches when updating lesson visibility to learners',
  },
  makeLessonNotVisibleText: {
    message:
      'Learners will no longer be able to see this lesson. Resource files in this lesson will be removed from learn-only devices that are set up to sync with this server.',
    context: 'Informational prompt for coaches when updating lesson visibility to learners',
  },
  totalLessonsSize: {
    message: 'Total size of lessons visible to learners: {size}',
    context:
      "Descriptive text at the top of the table that displays the calculated file size of all lessons' resources (i.e. 120 MB)",
  },
  membersLabel: {
    message: 'Members',
    context:
      "Refers to members of a group.\n\nIn the 'Members' sub-tab within the 'Reports' section, coaches can view a summary of completed exercises, scores and viewed resources for each group learner.",
  },
  nameLabel: {
    message: 'Name',
    context: "Refers here to a learner's name.",
  },
  noResourcesInLessonLabel: {
    message: 'No resources in this lesson',
    context:
      'Message that displays in Plan > Lessons when no learning resources have been added to a lesson.',
  },
  orderFixedLabel: {
    message: 'Fixed',
    context:
      "Description of the 'Fixed' question order. To present the same (fixed) question order to all learners, coaches select 'Fixed'.",
  },
  orderFixedDescription: {
    message: 'Each learner sees the same question order',
    context:
      "Coaches can choose between 'Randomized' and 'Fixed' question order when they create quizzes. \n\nThis text is a description of the 'Fixed' question order.",
  },
  orderRandomLabel: {
    message: 'Randomized',
    context:
      "Description of the 'Randomized' question order. To present the questions in a different (random) order to each learner, coaches select 'Randomized'.",
  },
  orderRandomDescription: {
    message: 'Each learner sees a different question order',
    context:
      "Coaches can choose between 'Randomized' and 'Fixed' question order when they create quizzes.\n\nThis text is a description of the 'Randomized' question order.",
  },
  planLabel: {
    message: 'Plan',
    context:
      "Translate as a VERB. Refers to the 'Plan' tab where coaches manage lessons, quizzes, and groups.",
  },
  previewLabel: {
    message: 'Preview',
    context:
      'When coaches have finished selecting resources for a quiz, they can  preview the quiz to see what it looks like.',
  },
  questionLabel: {
    message: 'Question',
    context: 'Refers to a quiz question.',
  },
  questionsLabel: {
    message: 'Questions',
    context: 'Refers to quiz questions.',
  }, // Kept here for use in common.js
  questionOrderLabel: {
    message: 'Question order',
    context: 'Indicates the window where the coach can choose the question order for a quiz.',
  },
  quizClosedLabel: {
    message: 'Quiz ended',
    context:
      'A label indicating that the currently viewed quiz is ended - meaning that learners will no longer be able to give answers to the quiz.',
  },
  quizzesLabel: {
    message: 'Quizzes',
    context: 'Plural of quiz.',
  }, // Kept here for use in common.js
  quizzesAssignedLabel: {
    message: 'Quizzes assigned',
    context:
      'Indicates which quizzes have been assigned to a learner or a group in the report section.',
  },
  recipientsLabel: {
    message: 'Recipients',
    context:
      "Newly created quizzes are by default visible to an entire class.\n\nHowever, coaches can change who can see quizzes by selecting groups or individual learners instead of the whole class. These groups or individual learners are called 'recipients'.",
  },
  reportLabel: {
    message: 'Report',
    context:
      'Reports are representations of learner progress and performance data shown to coaches in a class.',
  },
  reportsLabel: {
    message: 'Reports',
    context:
      'Reports are representations of learner progress and performance data shown to coaches in a class.',
  },
  resourcesViewedLabel: {
    message: 'Resources viewed',
    context:
      "In the 'Reports' tab, coaches can see the number of viewed learning resources for each learner.",
  },
  startedLabel: {
    message: 'Started',
    context: 'Indicates if a learner has started a specific activity, like a quiz.',
  },
  statusLabel: {
    message: 'Status',
    context:
      "The 'Status' column indicates whether a quiz is opened for learners (whether they can still answer the questions), or whether the quiz has ended. It also indicates whether the quiz is still visible to learners in the Learn > Classes view.",
  },
  titleLabel: {
    message: 'Title',
    context: 'Generic label for the name of some element like a lesson.',
  },
  ungroupedLearnersLabel: {
    message: 'Ungrouped learners',
    context: 'Refers to learners who are not part of a specific group.',
  },

  // notifications
  updatedNotification: {
    message: 'Updated',
    context: 'Generic notification.',
  },
  createdNotification: {
    message: 'Created',
    context: 'Generic notification.',
  },
  deletedNotification: {
    message: 'Deleted',
    context: 'Generic notification.',
  },

  // errors
  saveLessonError: {
    message: 'There was a problem saving this lesson',
    context: 'Error message.',
  },
  saveQuizError: {
    message: 'There was a problem saving this quiz',
    context: 'Error message.',
  },

  // empty states
  activityListEmptyState: {
    message: 'There is no activity',
    context:
      'Where there is no learner activity in a class or group this message will display in the activity section.',
  },
  groupListEmptyState: {
    message: 'There are no groups',
    context: 'Displays when no groups have been created in the Plan > Groups tab.',
  },
  learnerListEmptyState: {
    message: 'There are no learners',
    context: 'Message displayed when there are no learners enrolled in a class.',
  },
  lessonListEmptyState: {
    message: 'There are no lessons',
    context: 'Message displayed when there are no lessons created in the class.',
  },
  questionListEmptyState: {
    message: 'There are no questions',
    context: 'Message that displays when no questions have been added to a quiz.',
  },
  quizListEmptyState: {
    message: 'There are no quizzes',
    context:
      'When no quizzes have been created this message will display in the class information screen.',
  },

  // toggles
  viewByGroupsLabel: {
    message: 'View by groups',
    context:
      'Coaches can access the reports about the progress in lessons and quizzes per each group',
  },

  // formatted values
  nthExerciseName: {
    message: '{name} ({number, number, integer})',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  numberOfQuestions: {
    message: '{value, number, integer} {value, plural, one {question} other {questions}}',
    context:
      "Refers to the number of questions in a quiz. Only translate 'question' and 'questions'.",
  },
  numberOfResources: {
    message: '{value, number, integer} {value, plural, one {resource} other {resources}}',
    context:
      "Refers to the number of resources in a lesson. Only translate 'resource' and 'resources'.",
  },
  resourcesAndSize: {
    message: '{value, number, integer} {value, plural, one {resource} other {resources}}, {size}',
    context:
      "Refers to the number of resources in a lesson and the total size (i.e. 20 MB) of the lesson. Only translate 'resource' and 'resources'.",
  },
  ratioShort: {
    message: '{value, number, integer} of {total, number, integer}',
    context:
      "Refers to a number out of a total. For example, a number of learners in a class. \n\ne.g. 5 of 10. (Only translate 'of'.)",
  },
  sizeLabel: {
    message: 'Size',
    context:
      'Refers to the number of resources in a lesson or quiz, and/or the total size (i.e. 20 MB) of the lesson or quiz.',
  },

  // Errors
  quizDuplicateTitleError: {
    message: 'A quiz with that name already exists',
    context:
      'Error message which displays if user tries to use the same title for a quiz as one that has already been created.',
  },
  lessonDuplicateTitleError: {
    message: 'A lesson with this name already exists',
    context:
      'Error message. Displays when a user tries to use a name for a lesson that already exists in Kolibri.',
  },

  // Quiz activation / closing / etc
  lessonVisibleLabel: {
    message: 'Visible to learners',
    context:
      'A label indicating that the learners can see the lesson when the switch is turned "on"',
  },
  reportVisibleLabel: {
    message: 'Report visible',
    context:
      'A label used on a switch indicating that the learners can see their reports when the switch is turned "on"',
  },
  quizOpenedMessage: {
    message: 'Quiz started',
    context: 'A brief snackbar message notifying the user that the quiz was successfully started.',
  },
  quizFailedToOpenMessage: {
    message: 'There was a problem starting the quiz. The quiz was not started.',
    context:
      'A brief snackbar message notifying the user that there was an error trying to start the quiz and that the quiz was not started.',
  },
  quizClosedMessage: {
    message: 'Quiz ended',
    context:
      "A brief snackbar message notifying the user that the quiz was successfully ended. Displays when the user clicks 'End quiz'.",
  },
  quizFailedToCloseMessage: {
    message: 'There was a problem ending the quiz. The quiz was not ended.',
    context:
      'A brief snackbar message notifying the user that there was an error trying to end the quiz and that the quiz was not ended.',
  },
  quizVisibleToLearners: {
    message: 'Quiz report is visible to learners',
    context:
      'A brief snackbar message notifying the user that learners may view their quiz report. It will show when the user changes a setting to make the quiz visible.',
  },
  quizNotVisibleToLearners: {
    message: 'Quiz report is not visible to learners',
    context:
      'A brief snackbar message notifying the user that learners may no longer view their quiz report. It will show when the user changes a setting to make the quiz no longer visible.',
  },
  makeQuizReportVisibleTitle: {
    message: 'Make quiz report visible',
  },
  makeQuizReportNotVisibleTitle: {
    message: 'Make quiz report not visible',
  },
  makeQuizReportVisibleText: {
    message:
      'Learners will be able to see this quiz report. Resource files in this quiz will be downloaded to learn-only devices that are set up to sync with this server.',
    context:
      'A message within a pop up modal explaining the impact of changing the quiz report visibility to learners',
  },
  makeQuizReportNotVisibleText: {
    message:
      'Learners will no longer be able to see this quiz report. Resource files in this quiz will be removed from learn-only devices that are set up to sync with this server.',
    context:
      'A message within a pop up modal explaining the impact of changing the quiz report visibility to learners',
  },
  openQuizLabel: {
    message: 'Start quiz',
    context:
      "Label for a button that, when clicked, will 'start' a quiz - making it active so that learners may take the quiz.",
  },
  openQuizModalDetail: {
    message:
      'Starting the quiz will make it visible to learners and they will be able to answer questions.',
    context:
      "Text shown on a modal pop-up window when the user clicks the 'Start Quiz' button. This explains what will happen when the user confirms the action of starting the quiz.",
  },
  canNoLongerEditQuizNotice: {
    message: 'You will no longer be able to edit the questions and sections of the quiz.',
    context:
      'In the modal pop-up window when the user clicks the "Start Quiz" button, explains that they will not be able to edit the quiz after starting it.',
  },
  openQuizModalEmptySections: {
    message: 'Any sections without questions will be removed from the quiz.',
    context:
      "Text shown on a modal pop-up window when the user clicks the 'Start Quiz' button. This explains that empty sections will be removed from the quiz.",
  },
  closeQuizLabel: {
    message: 'End quiz',
    context:
      "Label for a button that, when clicked, will 'end' a quiz. This makes the quiz inactive and Learners will no longer be able to give answers.",
  },
  closeQuizModalDetail: {
    message:
      'All learners will be given a final score and a quiz report. Unfinished questions will be counted as incorrect.',

    context:
      "Text shown on a modal pop-up window when the user clicks the 'End Quiz' button. This explains what will happen when the modal window is confirmed.",
  },
  lessonNotVisibleToLearnersLabel: {
    message: 'Lesson is not visible to learners',
    context:
      'Snackbar message telling the user that the lesson is now not visible to learners. This will display whenever the user changes the lesson from visible to not visible.',
  },
  lessonVisibleToLearnersLabel: {
    message: 'Lesson is visible to learners',
    context:
      'Snackbar message telling the user that the lesson is now visible to learners. This will display whenever the user changes the lesson from not visible to visible.',
  },
  dontShowAgain: {
    message: "Don't show this message again",
    context: 'Option for a check box to not be prompted again with an informational modal',
  },
  fileSizeToDownload: {
    message: 'File size to download: {size}',
    context:
      'The size of the file or files that must be downloaded to learner devices for the lesson or quiz, (i.e. 20 KB)',
  },
  fileSizeToRemove: {
    message: 'File size to remove: {size}',
    context:
      'The size of the file or files that will be removed from learner devices for the lesson or quiz, (i.e. 20 KB)',
  },
  lodQuizDetail: {
    message:
      'Resource files in this quiz will be downloaded to learn-only devices that are set up to sync with this server.',
    context:
      'Information provided to a coach when starting a quiz that has been assigned to learners.',
  },
  // TODO - move these into diff sections as we make this a full feature in 0.16
  // Past Papers Project (12/2021) strings
  latestScoreLabel: {
    message: 'Latest score',
    context:
      'Heading for most recent score for a practice quiz in table of learners. Found in Reports > Lesson > Practice quiz.',
  },
  attemptsLabel: {
    message: 'Attempts',
    context:
      'Heading for total number of times a learner took a practice quiz in table of learners. Found in Reports > Lesson > Practice quiz.',
  },
  difficultQuestionsDescription: {
    message: 'Difficult questions in the most recent attempt of all learners',
    context: "Description for the 'Difficult questions' subtab.",
  },
  answerLogCorrectLabel: {
    message: 'Learner answered this correctly on the previous attempt',
    context:
      'Label that indicates to the coach that the learner answered this question correctly last time they took the quiz.',
  },
  answerLogIncorrectLabel: {
    message: 'Learner also answered this incorrectly on the previous attempt',
    context:
      'Label that indicates to the coach that the learner answered this question incorrectly both on this attempt and on the previous one',
  },
  answerLogImprovedLabel: {
    message: 'Learner improved their incorrect answer from the previous attempt',
    context:
      'Label that indicates to the coach that the learner got the question wrong on the previous attempt, but got it correctly this time.',
  },
  practiceQuizReportImprovedLabel: {
    message:
      'Learner improved at {value, number, integer} {value, plural, one {question} other {questions}}',
    context:
      'Indicates to the coach how many questions the learner answered correctly compared to the previous attempt',
  },
  coachReportsLesson: {
    message: 'Report lesson',
    context: 'Labels the Reports > Lesson tab for screen reader users',
  },
});

// Strings for the Missing Content modals, tooltips, alerts, etc.
const MissingContentStrings = createTranslator('MissingContentStrings', {
  upgradeKolibriTitle: {
    message: 'Upgrade Kolibri to view resources',
    context: 'Title of the modal window',
  },
  upgradeKolibriP1: {
    message:
      'Some resources are not supported by this version of Kolibri. You may need to upgrade to view them.',

    context: 'First paragraph of the "Upgrade Kolibri to view resources" modal',
  },
  upgradeKolibriLinkText: {
    message: 'Go to download page',
    context:
      'Text for the link displayed at the bottom of the "Upgrade Kolibri to view resources" modal',
  },
});

function coachString(key, args) {
  return coachStrings.$tr(key, args);
}

const coachStringsMixin = {
  methods: {
    coachString,
    getMissingContentString(key, args) {
      return MissingContentStrings.$tr(key, args);
    },
  },
};

export { coachString, coachStrings, coachStringsMixin };

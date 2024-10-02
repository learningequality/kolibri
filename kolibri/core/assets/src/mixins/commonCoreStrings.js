import { createTranslator } from 'kolibri.utils.i18n';
import camelCase from 'lodash/camelCase';
import get from 'lodash/get';
import invert from 'lodash/invert';
import * as METADATA from 'kolibri.coreVue.vuex.constants';
import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
import notificationStrings from './notificationStrings';

export const coreStrings = createTranslator('CommonCoreStrings', {
  // actions
  acceptAction: {
    message: 'Accept',
    context: 'Button to agree and accept the selected terms',
  },
  cancelAction: {
    message: 'Cancel',
    context:
      'Button to cancel an action and return to the previous page. Usually this is the opposite of the save button which saves some piece of information.',
  },
  learnMoreAction: {
    message: 'Learn more',
    context:
      'Button for link which will show the user information providing more information about the relevant context',
  },
  cannotUndoActionWarning: {
    message: 'This action cannot be undone',
    context:
      'Warning to indicate that a specific procedure that the user is carrying out at that time can not be reversed.',
  },
  clearAction: {
    message: 'Clear',
    context: 'Button that allows to clear a single *task* from the list in the task manager.',
  },
  clearAllAction: {
    message: 'Clear all',
    context: 'Button that allows a user to clear all selections or filters.',
  },
  closeAction: {
    message: 'Close',
    context: 'Closes some element in Kolibri, like a window.',
  },
  confirmAction: {
    message: 'Confirm',
    context:
      "The 'Confirm' button will display when a user attempts to carry out a specific action in Kolibri that needs confirmation. For example, they will be asked to confirm if they want to assign a coach to a class.",
  },
  continueAction: {
    message: 'Continue',
    context:
      'Used on a button to move to the next step in a process like creating an account, for example.',
  },
  declineAction: {
    message: 'Decline',
    context: 'Button text to decline selected terms (i.e. cookie usage)',
  },
  deleteAction: {
    message: 'Delete',
    context:
      'Used to delete an element from Kolibri.\n\nFor example, an admin can delete a user from a facility if they are no longer a user there.',
  },
  editAction: {
    message: 'Edit',
    context:
      "Edit allows users to change some element in Kolibri.\n\nFor example, a coach can use 'Edit' to rename their class or an admin can edit the name of their facility.",
  },
  editDetailsAction: {
    message: 'Edit details',
    context:
      "'Edit details' changes a set of information in Kolibri.\n\nFor example, in a list of users, selecting OPTIONS > 'Edit details' allows a user to edit other users' information like their name, username or type.",
  },
  filter: {
    message: 'filter',
    context:
      'The filter functionality allows users to find elements in Kolibri more efficiently. For example, in a list of users the filter can be used to view users by permissions, user type or facility.',
  },
  finishAction: {
    message: 'Finish',
    context:
      "'Finish' in general completes an action that a user may be carrying out in Kolibri.\n\nFor example, when a user creates an account, once they've completed all the information they would select the 'FINISH' button.",
  },
  goBackAction: {
    message: 'Go back',
    context:
      "Indicates going back to a previous step.\n\nFor example, when a user creates a quiz in Kolibri using the quiz builder they can either 'CONTINUE' to the next phase of the builder or 'GO BACK'.\n\nIf you go back you exit the quiz builder and loose the resource selection.",
  },
  backAction: {
    message: 'Back',
    context:
      'Indicates going back to a previous step in multi-step workflows. It can be used as a label of the back button that is displayed next to the continue button.',
  },
  importAction: {
    message: 'Import',
    context:
      'Indicates importing something into Kolibri, depending on the context can be a list of lessons, a single user, etc.',
  },
  registerAction: {
    message: 'Register',
    context: 'Register a facility to the Kolibri Data Portal',
  },
  manageSyncAction: {
    message: 'Manage sync schedule',
    context: 'Action for managing sync schedule',
  },
  whenAvailable: {
    message: 'When available',
    context:
      'An option to select to sync learner progress data to either a local or an online server whenever it is available on the network or Internet.',
  },
  retryAction: {
    message: 'Retry',
    context:
      'Button which allows a user to retry an action that may have failed due to an unexpected reason such as a loss of connection.',
  },
  removeAction: {
    message: 'Remove',
    context:
      'Description of a remove task. For example, a coach can remove a user from a class if they are no longer in that class.\n',
  },
  downloadAction: {
    message: 'Download',
    context: 'Label for a button used to initiate a file download.',
  },
  saveAction: {
    message: 'Save',
    context:
      'Button which allows a user to save a specific state in Kolibri.\n\nFor example, if a coach creates a new class they need to enter a name for the class and save that class name to continue.',
  },
  saveChangesAction: {
    message: 'Save changes',
    context:
      'When a user edits an entity en Kolibri that changes some piece of information about it, they need to save those changes.',
  },
  selectAllOnPageAction: {
    message: 'Select all on page',
    context:
      "If admins have imported resources on one Kolibri device, and want to make them available on another computer where Kolibri is installed, they can export them either in full, or make a selection of the resources to be exported.\n\nThe 'Select all on page' option allows admins to export all the resources in bulk that are on that page rather than individually.",
  },
  showAction: {
    message: 'Show',
    context:
      "Users have the option to either 'show' or 'hide' coach resources in the 'Manage lesson resources' section.",
  },
  showMoreAction: {
    message: 'Show more',
    context:
      'Generic button which allows user to see more content on a page. For example more learning resources.',
  },
  startOverAction: {
    message: 'Start over',
    context:
      "An action that restarts a learning resource.\n\nFor example, learners might 'start over' a quiz to do it again.",
  },
  syncAction: {
    message: 'Sync',
    context:
      "The 'Sync facility' feature is located in the Device > Facilities dashboard.\n\nBy pressing the 'SYNC' button, an admin can, for example, synchronize facility data (classes, groups, learner progress) with a device from which they previously imported it from.",
  },
  justNow: {
    message: 'Just now',
    context: 'This is used to indicate when an event occurred.',
  },
  updateAction: {
    message: 'Update',
    context:
      "If a user account has been created prior to version 0.13 of Kolibri, the user will see a notification that they can update their profile to provide their birth year and gender. \n\nThe 'UPDATE' button allows them to provide this new information if they choose to do so.",
  },
  viewAll: {
    message: 'View all',
    context: 'Option to view all available options',
  },
  viewAction: {
    message: 'View',
    context:
      'This text appears in several places in Kolibri where users can see some specific information. For example, they can view changes when a public channel is updated, or view a list of notifications about quizzes.',
  },
  viewTasksAction: {
    message: 'View tasks',
    context:
      "In the Kolibri Task Manager dashboard admins can view resource management tasks (import, export, deletion, update, etc.) and observe their progress.\n\nSelecting 'View task' will display more detail about the management task.",
  },
  removeFromBookmarks: {
    message: 'Remove from bookmarks',
    context:
      "An action that removes a resource or topic from a user's bookmarks. The opposite of 'Save to bookmarks'.",
  },
  saveToBookmarks: {
    message: 'Save to bookmarks',
    context: "An action that adds a resource or topic to a user's bookmarks",
  },
  zoomIn: {
    message: 'Zoom in',
    context: 'Label for a button used to zoom in the document view (make it larger)',
  },
  zoomOut: {
    message: 'Zoom out',
    context: 'Label for a button used to zoom out the document view (make it smaller)',
  },

  // labels, phrases, titles, headers...
  adminLabel: {
    message: 'Admin',
    context:
      'Refers to a user with an admin role. This role is marked with a label in a list of users.',
  },
  allClassesLabel: {
    message: 'All classes',
    context:
      'This is an option that takes a user back to view *all the classes* that they have access to in their facility.\n\nYou see this option when you are looking at a specific class and you want to go back to the full list. Only admins see this option.',
  },
  allFacilitiesLabel: {
    message: 'All facilities',
    context:
      'If a user has access to multiple facilities, this option will allow them to view *all* the facilities in the list.',
  },
  allLabel: {
    message: 'All',
    context:
      'Used when users want to filter a list of elements by type. For example, they can filter users by user type, or simply view a list of all users in a facility.',
  },
  allLessonsLabel: {
    message: 'All lessons',
    context:
      'This is an option that takes the user back to view all the reports and class materials for the lessons that they have access to in their class.\n\nThis option shows when a coach is looking at a specific lesson and wants to go back to the *full* list.',
  },
  birthYearLabel: {
    message: 'Birth year',
    context:
      "This label appears in various places and indicates the year in which a user was born. The birth year only displays if this information has been provided when creating or editing the user, as it's an optional field.\n\nA super admin can see the birth year of the users in a facility that they manage, for example, if this information has been provided.",
  },
  bookmarksLabel: {
    message: 'Bookmarks',
    context:
      'Bookmarks are used to give all users a way of saving a reference for a specific resource or topic to come back to later.',
  },
  bookmarkedTimeAgoLabel: {
    message: 'Bookmarked { time }',
    context:
      "Label indicating how long ago user bookmarked a resource or topic. Variable '{time}' uses the API that enables language-sensitive relative time formatting\nhttps://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat\n\nExamples (output is localized in the target language):\n- Bookmarked {3 months ago}\n- Bookmarked {5 minutes ago}\n- Bookmarked {6 days ago}",
  },
  channelsLabel: {
    message: 'Channels',
    context:
      'Channels are collections of educational resources (video, audio, document files or interactive apps) prepared and organized by the channel curator for their use in Kolibri.\n\nA learner will see a set of channels available to them when they first open Kolibri.',
  },
  channelLabel: {
    message: 'Channel',
    context:
      'Channels are collections of educational resources (video, audio, document files or interactive apps) prepared and organized by the channel curator for their use in Kolibri.',
  },
  classCoachLabel: {
    message: 'Class coach',
    context:
      'When you create a new coach or change the user type to coach for an existing user, you can choose between class coach and facility coach.\n\nA class coach has access to the coach dashboard and permissions to instruct only the learners in the classes they are assigned to.',
  },
  classNameLabel: {
    message: 'Class name',
    context: 'The name that a user gives to a specific class like Grade 7 or English 6B.',
  },
  classesLabel: {
    message: 'Classes',
    context:
      'In the classes section of Kolibri users can view the list of all the classes in their facility, with the number of enrolled users for each class, and the coaches assigned.',
  },
  coachLabel: {
    message: 'Coach',
    context:
      'A coach is a specific type of user in Kolibri who can manage  classes and learners. A coach can be either a class coach or a facility coach.',
  },
  coachesLabel: {
    message: 'Coaches',
    context:
      "In a list of classes, users can see which coaches manage which specific classes in the 'Coaches' column.",
  },
  completedLabel: {
    message: 'Completed',
    context:
      "A topic is marked as 'Completed' when a learner finishes that specific topic within an educational resource. A topic could be a video, audio, document file or interactive app.",
  },
  dataLabel: {
    message: 'Data',
    context: "Title of tab in 'Facility' section.",
  },
  deviceNameLabel: {
    message: 'Device name',
    context:
      'The device name indicates the name of the device where Kolibri is running. Accessed in the Device > Info section.',
  },
  devicePermissionsLabel: {
    message: 'Device permissions',
    context:
      'A user can grant permission to another user to manage channels and resources in Kolibri, that is to import, export and delete them from the device used.',
  },
  facilityCoachLabel: {
    message: 'Facility coach',
    context:
      'A type of coach account that has permission to view and manage all classes in a facility.',
  },
  facilityLabel: {
    message: 'Facility',
    context: 'A facility is a center of education, such as a school.',
  },
  facilitiesLabel: {
    message: 'Facilities',
    context:
      'Facilities are the centers of education which are managed in Kolibri, such as a school. To manage facilities on a given device, a user must have super admin permissions.',
  },
  facilityName: {
    message: 'Facility name',
    context: "The name of the facility. For example: 'Demo facility'.",
  },
  facilityNameWithId: {
    message: '{facilityName} ({id})',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  facilityDuplicated: {
    message: 'There is already a facility with this name on this device',
    context:
      'This message is displayed if a user tries to name or rename a facility with a name that already exists on the device they are using.',
  },
  fullNameLabel: {
    message: 'Full name',
    context:
      "The full name is the user's complete name. This is usually made up of a user's given and family names (sometimes called first and last names in some cultures).",
  },
  genderLabel: {
    message: 'Gender',
    context:
      "Gender is an option which a user can select in Kolibri when they create another user.\n\nGender can be either 'Female', 'Male' or 'Not specified'.",
  },
  homeLabel: {
    message: 'Home',
    context:
      "Home page is a place for learners containing summary of their activities and suggestions for what to do next. For example, they can see a list of classess they're enrolled in, their recent lessons and quizess, and they can directly navigate to resources to continue learning from.",
  },
  identifierLabel: {
    message: 'Identifier',
    context:
      "An 'Identifier' could be a student ID number or an existing user identification number. This is an optional field in the user create/edit screen.",
  },
  infoLabel: {
    message: 'Info',
    context: "Title of tab in 'Device' section.",
  },
  inProgressLabel: {
    message: 'In progress',
    context:
      "Indicates a task such as a sync is in progress. A lesson or class could also be in progress if the learner hasn't finished it yet.",
  },
  kolibriLabel: {
    message: 'Kolibri',
    context:
      'This proper noun is the name of the learning platform, and is pronounced ko-lee-bree (/kolibɹi/). For languages with non-latin scripts, the word should be transcribed phonetically into the target language, similar to a person\'s name. It should not be translated as "hummingbird".',
  },
  languageLabel: {
    message: 'Language',
    context:
      'Refers to the language that is used in a resource or in Kolibri. For example, users can filter learning resources by language.',
  },
  learnerLabel: {
    message: 'Learner',
    context:
      'Learner is an account type that has limited permissions. Learners can be enrolled in classes, get assigned resources through lessons and quizzes, and navigate channels directly.\n\nWe intentionally did not use the term "student" to be more inclusive of non-formal educational contexts.',
  },
  learnersLabel: {
    message: 'Learners',
    context: 'Plural of learner.',
  },
  levelLabel: {
    message: 'Level',
    context: 'Filter label used to limit the search to a specific educational level.',
  },
  lessonsLabel: {
    message: 'Lessons',
    context:
      'A lesson is a linear learning pathway defined by a coach. The coach can select resources from any channel, add them to the lesson, define the ordering, and assign the lesson to learners in their class.',
  },
  libraryLabel: {
    message: 'Library',
    context:
      "The 'Library' section displays channels available on Kolibri server, and allows learners to browse, explore and filter topics and resources on their own.",
  },
  loadingLabel: {
    message: 'Loading…',
    context: 'Message displayed when a resource is loading indicating that the user should wait.',
  },
  menuLabel: {
    message: 'Menu',
    context:
      'Label that indicates a list of options. May be a button label, or a reference to the menu itself',
  },
  nameLabel: {
    message: 'Name',
    context: 'Might indicate the name of a resource in Kolibri.',
  },
  noUsersExistLabel: {
    message: 'No users exist',
    context: 'Displays when there are no users in the facility.',
  },
  noResultsLabel: {
    message: 'No results',
    context: 'Displays when there are no matching search results',
  },
  optionsLabel: {
    message: 'Options',
    context:
      'Generally the OPTIONS dropdown menu displays beside a user in a list of users.\n\nIf you select OPTIONS it will display a list of options of actions that you can do with that user. For example, edit their details, reset their password or delete them. ',
  },
  passwordLabel: {
    message: 'Password',
    context: "'Password' is a required field when you create an account as a user on Kolibri.",
  },
  profileLabel: {
    message: 'Profile',
    context: "Users can access and edit their personal details via the 'profile' option.",
  },
  progressLabel: {
    message: 'Progress',
    context:
      "A coach can view learner progress in Kolibri.\n\nFor example, in the Coach > Reports section under the 'Progress' column they can see how many learners have started a lesson, or if a learner needs help.\n",
  },
  questionNumberLabel: {
    message: 'Question { questionNumber, number }',
    context: 'Indicates the question number in a quiz that a learner could be taking.',
  },
  questionsCorrectLabel: {
    message: 'Questions answered correctly',
    context:
      "In a report, learners can see how many questions they have got correct in a quiz.\n\nThe 'Questions answered correctly' label will indicate something like 4 out of 5, or 8 out of 10, for example.",
  },
  questionsCorrectValue: {
    message: '{correct, number} out of {total, number}',
    context:
      "When a learner views their report they can see how many questions they answered correctly in a quiz.\n\nThe 'Questions correct' label will indicate something like 4 out of 5, or 8 out of 10, for example. That's to say, the number of correct answers as well as the total number of questions.",
  },
  quizzesLabel: {
    message: 'Quizzes',
    context:
      'A quiz is a summative assessment made up of questions taken from exercises. Quizzes are created by coaches and then assigned to learners in a class.\n\nWe intentionally renamed "exam" to "quiz" in order to encourage use as an informal diagnostic tool for teachers.',
  },
  resourcesLabel: {
    message: 'Resources',
    context:
      'A resource is a general term for the videos, exercises, apps, and other materials available in the learning platform.',
  },
  searchLabel: {
    message: 'Search',
    context: 'Test used to indicate the Kolibri search field.',
  },
  searchForUser: {
    message: 'Search for a user...',
    context:
      'Text which appears in the search field above the table with users from whom to choose from (e.g. when enrolling learners to a class, selecting users to sync, etc.)',
  },
  settingsLabel: {
    message: 'Settings',
    context: "Title of tab used in 'Facility' and 'Device' sections.",
  },
  findSomethingToLearn: {
    message: 'Find something to learn',
    context: 'Suggestion located inside the the keyword search field.',
  },
  startSearchButtonLabel: {
    message: 'Start search',
    context: 'Refers to the search button used to initiate a search.',
  },
  showCorrectAnswerLabel: {
    message: 'Show correct answer',
    context:
      "The 'Show correct answer' checkbox allows learners to visualize the answer for the quiz questions that they did not answer correctly.",
  },
  signInLabel: {
    message: 'Sign in',
    context:
      "Users select the 'SIGN IN' button if they already have an account and a username in Kolibri to get access to the platform.",
  },
  superAdminLabel: {
    message: 'Super admin',
    context:
      'A super admin is an account type that can manage devices. Super admin accounts also have permission to do everything that admins, coaches, and learners can do.',
  },
  tasksLabel: {
    message: 'Tasks',
    context:
      "When waiting for a facility to import admins see a 'Tasks' section. This shows the progress of the import.\n\nOnce the task is finished they can clear this information.",
  },
  usageAndPrivacyLabel: {
    message: 'Usage and privacy',
    context:
      'The "Usage and privacy" link displays on the \'Create an account\' screen and on the left navigation bar.\n\nIt contains information about who has access to personal information of users.',
  },
  cookiePolicy: {
    message: 'Cookie policy',
    context:
      'The "Cookie policy" link displays on the \'cookie notification\' banner and on the left navigation bar.\n\nIt contains information about usage of cookies within online Kolibri instances. It is also used as a title and heading on the page that describes this policy.',
  },
  userTypeLabel: {
    message: 'User type',
    context:
      "'User type' is used to define what kind of permissions the user has in Kolibri.\n\n'User type' can be either Learner, Coach, Admin or Super admin.",
  },
  usernameLabel: {
    message: 'Username',
    context: 'A name that uniquely identifies an account within a facility.',
  },
  usersLabel: {
    message: 'Users',
    context:
      'A user is any person who has access to a facility in Kolibri. There are  four main types of users in Kolibri: Learners, Coaches, Admins and Super admins.',
  },
  uncountedAdditionalResults: {
    message: 'More than { num, number } results',
  },
  viewMoreAction: {
    message: 'View more',
    context:
      'This button appears in Kolibri to indicate to users that there are more results available when they search for resources, for example.',
  },
  viewLessAction: {
    message: 'View less',
    context:
      "Button which allows a user to view less information. It's the opposite of 'View more'.",
  },
  copies: {
    message: '{ num, number} locations',
    context:
      'Some Kolibri resources may be duplicated in different topics or channels.\n\nSearch results will indicate when a resource is duplicated, and learners can click on the "...locations" link to discover the details for each location.',
  },
  viewInformation: {
    message: 'View information',
    context: 'Option to show more detailed information about a resource.',
  },
  moreOptions: {
    message: 'More options',
    context: 'Reveals a set of more options when clicked.',
  },
  userActionsColumnHeader: {
    message: 'Actions',
    context:
      'Column header for the table with class users. The column "Actions" contains buttons that allow admins to remove users from class.',
  },
  classHome: {
    message: 'Class home',
    context:
      'The main section where the coach can see all the information relating to a specific class..',
  },
  classCoachDescription: {
    message: 'Can only instruct classes that they are assigned to',
    context: 'Description of the "Class coach" user type.',
  },
  facilityCoachDescription: {
    message: 'Can instruct all classes in your facility',
    context: 'Description of the "Facility coach" user type.',
  },
  transcript: {
    message: 'Transcript',
    context:
      'Refers to the option to present the captions (subtitles) of the video in the form of the interactive transcript.',
  },
  rememberThisAccountInformation: {
    message: 'Important: please remember this account information. Write it down if needed.',
    context: 'Helper/information text to remind user to take note of their account information.',
  },

  // Learning Activities
  all: {
    message: 'All',
    context: 'A label for everything in the group of activities.',
  },
  watch: {
    message: 'Watch',
    context:
      'Resource and filter label for the type of learning activity with video. Translate as a VERB',
  },
  create: {
    message: 'Create',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  read: {
    message: 'Read',
    context:
      'Resource and filter label for the type of learning activity with documents. Translate as a VERB',
  },
  practice: {
    message: 'Practice',
    context:
      'Resource and filter label for the type of learning activity with questions and answers. Translate as a VERB',
  },
  reflect: {
    message: 'Reflect',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  listen: {
    message: 'Listen',
    context:
      'Resource and filter label for the type of learning activity with audio. Translate as a VERB',
  },
  explore: {
    message: 'Explore',
    context: 'Resource and filter label for the type of learning activity. Translate as a VERB',
  },
  activityType: {
    message: 'Activity type',
    context: 'Indicate the kind of learning activity, such as: reading, listening, watching, etc.',
  },

  // Library Categories
  school: {
    message: 'School',
    context: 'Category type.',
  },
  basicSkills: {
    message: 'Basic skills',
    context:
      'Category type. Basic skills refer to learning resources focused on aspects like literacy, numeracy and digital literacy.',
  },
  work: {
    message: 'Work',
    context:
      'Top level category group that contains resources for acquisition of professional skills.',
  },
  dailyLife: {
    message: 'Daily life',
    context: 'Category type. See https://en.wikipedia.org/wiki/Everyday_life',
  },
  forTeachers: {
    message: 'For teachers',
    context: 'Category type',
  },

  // School Categories
  mathematics: {
    message: 'Mathematics',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mathematics',
  },
  sciences: {
    message: 'Sciences',
    context: 'Category type. See https://en.wikipedia.org/wiki/Science',
  },
  socialSciences: {
    message: 'Social sciences',
    context: 'Category type. See https://en.wikipedia.org/wiki/Social_science',
  },
  arts: {
    message: 'Arts',
    context: 'Refers to a category group type. See https://en.wikipedia.org/wiki/The_arts',
  },
  computerScience: {
    message: 'Computer science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Computer_science',
  },
  languageLearning: {
    message: 'Language learning',
    context: 'Category type.',
  },
  history: {
    message: 'History',
    context: 'Category type.',
  },
  readingAndWriting: {
    message: 'Reading and writing',
    context: 'School subject category',
  },

  // Mathematics Subcategories
  arithmetic: {
    message: 'Arithmetic',
    context: 'Math category type. See https://en.wikipedia.org/wiki/Arithmetic',
  },
  algebra: {
    message: 'Algebra',
    context: 'A type of math category. See https://en.wikipedia.org/wiki/Algebra',
  },
  geometry: {
    message: 'Geometry',
    context: 'Category type.',
  },
  calculus: {
    message: 'Calculus',
    context: 'Math category type. https://en.wikipedia.org/wiki/Calculus',
  },
  statistics: {
    message: 'Statistics',
    context: 'A math category. See https://en.wikipedia.org/wiki/Statistics',
  },

  // Sciences Subcategories
  biology: {
    message: 'Biology',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Biology',
  },
  chemistry: {
    message: 'Chemistry',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Chemistry',
  },
  physics: {
    message: 'Physics',
    context: 'Category type. See https://en.wikipedia.org/wiki/Physics.',
  },
  earthScience: {
    message: 'Earth science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Earth_science',
  },
  astronomy: {
    message: 'Astronomy',
    context: 'Science category type. See https://en.wikipedia.org/wiki/Astronomy',
  },

  //  Literature Subcategories
  literature: {
    message: 'Literature',
    context: 'Category type. See https://en.wikipedia.org/wiki/Literature',
  },
  readingComprehension: {
    message: 'Reading comprehension',
    context: 'Category type.',
  },
  writing: {
    message: 'Writing',
    context: 'Category type. See https://en.wikipedia.org/wiki/Writing',
  },
  logicAndCriticalThinking: {
    message: 'Logic and critical thinking',
    context: 'Category type. See https://en.wikipedia.org/wiki/Critical_thinking',
  },

  // Social Sciences Subcategories
  politicalScience: {
    message: 'Political science',
    context: 'Category type. See https://en.wikipedia.org/wiki/Political_science.',
  },
  sociology: {
    message: 'Sociology',
    context: 'Category type. See https://en.wikipedia.org/wiki/Sociology',
  },
  anthropology: {
    message: 'Anthropology',
    context: 'Category type. See https://en.wikipedia.org/wiki/Anthropology',
  },
  civicEducation: {
    message: 'Civic education',
    context:
      'Category type. Civic education is the study of the rights and obligations of citizens in society. See https://en.wikipedia.org/wiki/Civics',
  },

  // Arts Subcategories = {
  visualArt: {
    message: 'Visual art',
    context: 'Category type. See https://en.wikipedia.org/wiki/Visual_arts',
  },
  music: {
    message: 'Music',
    context: 'Category type. See https://en.wikipedia.org/wiki/Music',
  },
  dance: {
    message: 'Dance',
    context: 'Category type. See https://en.wikipedia.org/wiki/Dance',
  },
  drama: {
    message: 'Drama',
    context: 'Category type. See https://en.wikipedia.org/wiki/Drama',
  },

  //  Computer Science Subcategories
  programming: {
    message: 'Programming',
    context: 'Category type. See https://en.wikipedia.org/wiki/Computer_programming',
  },
  mechanicalEngineering: {
    message: 'Mechanical engineering',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mechanical_engineering.',
  },
  webDesign: {
    message: 'Web design',
    context: 'Category type. See https://en.wikipedia.org/wiki/Web_design',
  },

  // Basic Skills
  literacy: {
    message: 'Literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Literacy',
  },
  numeracy: {
    message: 'Numeracy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Numeracy',
  },
  digitalLiteracy: {
    message: 'Digital literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Digital_literacy',
  },
  learningSkills: {
    message: 'Learning skills',
    context:
      'A category label and type of basic skill.\nhttps://en.wikipedia.org/wiki/Study_skills',
  },

  // Work Categories
  professionalSkills: {
    message: 'Professional skills',
    context: 'Category type. Refers to skills that are related to a profession or a job.',
  },
  technicalAndVocationalTraining: {
    message: 'Technical and vocational training',
    context:
      'A level of education. See https://en.wikipedia.org/wiki/TVET_(Technical_and_Vocational_Education_and_Training)',
  },

  //  VocationalSubcategories
  toolsAndSoftwareTraining: {
    message: 'Software tools and training',
    context: 'Subcategory type for technical and vocational training.',
  },
  skillsTraining: {
    message: 'Skills training',
    context: 'Subcategory type for technical and vocational training.',
  },
  industryAndSectorSpecific: {
    message: 'Industry and sector specific',
    context: 'Subcategory type for technical and vocational training.',
  },

  // Daily Life Categories
  publicHealth: {
    message: 'Public health',
    context: 'Category type. See https://en.wikipedia.org/wiki/Public_health.',
  },
  entrepreneurship: {
    message: 'Entrepreneurship',
    context: 'Category type. See https://en.wikipedia.org/wiki/Entrepreneurship',
  },
  financialLiteracy: {
    message: 'Financial literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Financial_literacy',
  },
  currentEvents: {
    message: 'Current events',
    context:
      "Category type. Could also be translated as 'News'. See https://en.wikipedia.org/wiki/News",
  },
  environment: {
    message: 'Environment',
    context: 'Category type. See https://en.wikipedia.org/wiki/Environmental_studies',
  },
  mediaLiteracy: {
    message: 'Media literacy',
    context: 'Category type. See https://en.wikipedia.org/wiki/Media_literacy',
  },
  diversity: {
    message: 'Diversity',
    context: 'Category type. See https://en.wikipedia.org/wiki/Diversity_(politics)',
  },
  mentalHealth: {
    message: 'Mental health',
    context: 'Category type. See https://en.wikipedia.org/wiki/Mental_health',
  },

  // Teacher-Specific Categories
  guides: {
    message: 'Guides',
    context:
      'Category label in the Kolibri resources library; refers to any guide-type material for teacher professional development.',
  },
  lessonPlans: {
    message: 'Lesson plans',
    context:
      'Category label in the Kolibri resources library; refers to lesson planning materials for teachers.',
  },

  uncategorized: {
    message: 'Uncategorized',
    context: 'A label to indicate that no category label has been applied to the resource.',
  },

  // Resources Needed Categories = {
  forBeginners: {
    message: 'For beginners',
    context: 'Filter option and a label for the resources in the Kolibri Library.',
  },
  toUseWithPeers: {
    message: 'To use with peers',
    context:
      "'Peers' in this context refers to classmates or other learners who are interacting with Kolibri.",
  },
  toUseWithTeachers: {
    message: 'To use with teachers',
    context:
      'To use with a subject matter or pedagogical expert who is helping to guide the learner.',
  },
  toUseWithPaperAndPencil: {
    message: 'To use with paper and pencil',
    context: 'Refers to a filter for resources.\n',
  },
  needsInternet: {
    message: 'That need internet connection',
    context: 'Refers to a filter for resources.',
  },
  needsSpecialSoftware: {
    message: 'That need special software',
    context: 'Refers to a filter for resources.',
  },
  needsMaterials: {
    message: 'That need other materials',
    context: 'Refers to a filter for resources.\n',
  },

  // Accessibility category name
  accessibility: {
    message: 'Accessibility',
    context:
      'Allows the user to filter for all the resources with accessibility features for learners with disabilities.',
  },
  // Accessibility Categories
  signLanguage: {
    message: 'Has sign language captions',
    context:
      'https://en.wikipedia.org/wiki/Sign_language\nhttps://en.wikipedia.org/wiki/List_of_sign_languages\nWherever communities of deaf people exist, sign languages have developed as useful means of communication, and they form the core of local Deaf cultures. Although signing is used primarily by the deaf and hard of hearing, it is also used by hearing individuals, such as those unable to physically speak, those who have trouble with spoken language due to a disability or condition (augmentative and alternative communication), or those with deaf family members, such as children of deaf adults. ',
  },
  audioDescription: {
    message: 'Has audio descriptions',
    context:
      'Content has narration used to provide information surrounding key visual elements for the benefit of blind and visually impaired users.\nhttps://en.wikipedia.org/wiki/Audio_description',
  },
  taggedPdf: {
    message: 'Tagged PDF',
    context:
      'A tagged PDF includes hidden accessibility markups (tags) that make the document accessible to those who use screen readers and other assistive technology (AT).\n\nhttps://taggedpdf.com/what-is-a-tagged-pdf/',
  },
  altText: {
    message: 'Has alternative text description for images',
    context:
      'Alternative text, or alt text, is a written substitute for an image. It is used to describe information being provided by an image, graph, or any other visual element on a web page. It provides information about the context and function of an image for people with varying degrees of visual and cognitive impairments. When a screen reader encounters an image, it will read aloud the alternative text.\nhttps://www.med.unc.edu/webguide/accessibility/alt-text/',
  },
  highContrast: {
    message: 'Has high contrast display for low vision',
    context:
      "Accessibility filter used to search for resources that have high contrast color themes for users with low vision ('display' refers to digital content, not the hardware like screens or monitors).\nhttps://veroniiiica.com/2019/10/25/high-contrast-color-schemes-low-vision/",
  },
  captionsSubtitles: {
    message: 'Has captions or subtitles',
    context:
      'Accessibility filter to search for video and audio resources that have text captions for users who are deaf or hard of hearing.\nhttps://www.w3.org/WAI/media/av/captions/',
  },

  // Used to categorize the level or audience of content
  // ContentLevels
  preschool: {
    message: 'Preschool',
    context:
      'Refers to a level of education offered to children before they begin compulsory education at primary school.\n\nSee https://en.wikipedia.org/wiki/Preschool',
  },
  lowerPrimary: {
    message: 'Lower primary',
    context:
      'Refers to a level of learning. Approximately corresponds to the first half of primary school.',
  },
  upperPrimary: {
    message: 'Upper primary',
    context:
      'Refers to a level of education. Approximately corresponds to the second half of primary school.\n',
  },
  lowerSecondary: {
    message: 'Lower secondary',
    context:
      'Refers to a level of learning. Approximately corresponds to the first half of secondary school (high school).',
  },
  upperSecondary: {
    message: 'Upper secondary',
    context:
      'Refers to a level of education. Approximately corresponds to the second half of secondary school.',
  },
  tertiary: {
    message: 'Tertiary',
    context: 'A level of education. See https://en.wikipedia.org/wiki/Tertiary_education',
  },
  specializedProfessionalTraining: {
    message: 'Specialized professional training',
    context: 'Level of education that refers to training for a profession (job).',
  },
  allLevelsBasicSkills: {
    message: 'All levels -- basic skills',
    context: 'Refers to a type of educational level.',
  },
  allLevelsWorkSkills: {
    message: 'All levels -- work skills',
    context: 'Refers to a type of educational level.',
  },

  browseChannel: {
    message: 'Browse channel',
    context: 'Heading on page where a user can browse the content within a channel',
  },
  readReference: {
    message: 'Reference',
    context:
      "Label displayed for the 'Read' learning activity, used instead of the time duration information, to indicate a resource that may not need sequential reading from the beginning to the end. Similar concept as the 'reference' books in the traditional library, that the user just  'consults', and does not read from cover to cover.",
  },
  shortActivity: {
    message: 'Short activity',
    context: 'Label with time estimation for learning activities that take less than 30 minutes.',
  },
  longActivity: {
    message: 'Long activity',
    context: 'Label with time estimation for learning activities that take more than 30 minutes.',
  },
  shortExerciseGoalDescription: {
    message: 'Get {count, number, integer} {count, plural, other {correct}}',
    context:
      'Label that indicates to the learner how many correct answers they need to give in order to master the given topic, and for the exercise to be considered completed.',
  },
  practiceQuizLabel: {
    message: 'Practice quiz',
    context:
      'Label that indicates this self paced activity is in the style of a quiz, and learners will only see the correct answers once they have submitted the quiz.',
  },

  // assigning bookmarked resources

  availableClasses: {
    message: 'Available classes',
    context: 'Heading for the window where coaches make class selection.',
  },

  assignToClass: {
    message: 'Assign this resource to which class?',
    context: 'Message for coaches to select a class.',
  },
  assignToLesson: {
    message: 'Assign this resource to which lesson?',
    context: 'Message for coaches to select lessons',
  },
  lessonsInClass: {
    message: 'Lessons in {class name}',
    context: 'Heading for the window where coaches make lesson selections.',
  },
  addedToClassLesson: {
    message: 'Added to class lesson',
    context:
      'Notification that a bookmarked resource has been added to a lesson in a selected class.',
  },
  selectFromBookmarks: {
    message: 'Select from bookmarks',
    context: "Option on the 'Manage lesson resources' page.",
  },
  savedFromBookmarks: {
    message: 'Saved from bookmarks',
    context:
      'Notification message after user clicked the bookmark icon button, indicating the resource has been  saved.',
  },
  related: {
    message: 'Related',
    context: 'Section header for the list of resources that are related to the current resource',
  },
  doNotShowAgain: {
    message: "Don't show this again",
    context:
      'Option that allows the user to prevent this resource from displaying in the future while using category search',
  },
  doNotShowMessageAgain: {
    message: "Don't show this message again",
    context:
      'Option that allows the user to prevent this resource from displaying in the future while using category search',
  },
  resourceHidden: {
    message: 'Resource hidden',
    context:
      'Notification message indicating the resource has been marked as hidden for future category searches.',
  },
  allLevels: {
    message: 'All levels',
    context: 'Filter label to include resources for all available educational levels.',
  },
  showResources: {
    message: 'Show resources',
    context: 'Subheader to filter resources with the options listed below (see the screenshot).',
  },
  // Notifications
  changesSavedNotification: {
    message: 'Changes saved',
    context: 'Message that indicates that some changes that a user made have been saved.',
  },
  changesNotSavedNotification: {
    message: 'Changes not saved',
    context: 'Message that indicates that some changes that a user made have not been saved.',
  },

  // Errors
  requiredFieldError: {
    message: 'This field is required',
    context:
      'Warning message displayed to indicate a field where an input is required. The user cannot skip this field.',
  },
  usernameNotAlphaNumError: {
    message: 'Username can only contain letters, numbers, and underscores',
    context:
      "This is an error message that displays when users enter a username that contains characters other than letters, numbers or underscores.\n\nThis message appears on the 'Create an account' screen if the user enters unaccepted characters when entering a username.",
  },
  invalidCredentialsError: {
    message: 'Incorrect username or password',
    context:
      "Error message a user sees if they've used the wrong username or password when they sign in to Kolibri.",
  },

  // Formatting
  nameWithIdInParens: {
    message: `'{name}' ({id})`,
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  quotedPhrase: {
    message: `'{phrase}'`,
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  dashSeparatedPair: {
    message: '{item1} - {item2}',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  dashSeparatedTriple: {
    message: '{item1} - {item2} - {item3}',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  labelColonThenDetails: {
    message: '{label}: {details}',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },
  commaSeparatedPair: {
    message: '{item1}, {item2}',
    context: 'DO NOT TRANSLATE\nCopy the source string.',
  },

  // Demographic-specific strings
  genderOptionMale: {
    message: 'Male',
    context: "Male is an option in the 'Gender' drop down menu on the 'Create new user' page.",
  },
  genderOptionFemale: {
    message: 'Female',
    context: "Female is an option in the 'Gender' drop down menu on the 'Create new user' page.",
  },
  genderOptionNotSpecified: {
    message: 'Not specified',
    context:
      "Not specified is an option in the 'Gender' drop down menu on the 'Create new user' page.\n\nWhen creating a user you can either select a gender (Male/Female) or select 'Not specified' if you don't want to or can't provide this information.",
  },
  birthYearNotSpecified: {
    message: 'Not specified',
    context:
      "This is an option that appears in the 'Birth year' dropdown menu when you create or edit a user.\n\nWhen creating a user you can either select a birth year or select 'Not specified' if you don't want to or can't provide this information.",
  },
  identifierInputTooltip: {
    message:
      'Examples: a student ID number or an existing user identification number. Avoid using highly sensitive personal information because it might put your users at risk.',

    context:
      "Tooltip with information referring to the optional 'Identifier' field in the 'Create new user' form.\n",
  },
  identifierTooltip: {
    message: 'Examples: a student ID number or an existing user identification number.',
    context:
      "Tooltip with information referring to the optional 'Identifier' field in the 'Create new user' form.",
  },
  identifierAriaLabel: {
    message: 'About providing an identifier or ID number',
    context:
      "Could also be translated as \"View information about providing identifier\"\n\nAll 'AriaLabel' type of messages are providing additional context to the screen-reader users. \n\nIn this case the screen-reader will announce the message to the user indicating that they can access more information and examples about the 'Identifier' through the 'i' icon.",
  },

  // Missing resource strings
  someResourcesMissingOrNotSupported: {
    message: 'Some resources are missing or not supported',
    context:
      'Floating notification message that appears over the alert icon and indicates that there are missing resources',
  },
  resourceNotFoundOnDevice: {
    message: 'Resource not found on device',
    context:
      'Error message that displays if a learning resource cannot be found on the device being used currently.',
  },

  // Downloads management
  myDownloadsLabel: {
    message: 'My downloads',
    context: "Users can access and see their content downloads via 'my downloads' option.",
  },
  removeFromLibrary: {
    message: 'Remove from library',
    context:
      'Title of the modal that appears when the user tries to remove a resource from the library.',
  },
  resourcesSelectedMessage: {
    message: 'Selected: {count, number} {count, plural, one {resource} other {resources}} ({size})',
    context: 'Indicates how many resources have been selected to be deleted.\n',
  },
  removeSelectedMessage: {
    message: 'Remove selected',
    context: 'Action to remove selected resources',
  },
  dateCreated: {
    message: 'Date created',
    context: '',
  },
  totalSizeMyDownloads: {
    message: 'Total size of my downloads',
    context:
      'A lable explaining the size (i.e. in MB) of the resources a user has downloaded to their library',
  },
  availableStorage: {
    message: 'Available storage',
    context:
      'A lable explaining the amount (i.e. in MB) of the storage remaining that a user has to downloads items to their library',
  },
  fileSize: {
    message: 'File size',
    context: 'A lable explaining the size (i.e. in MB) of a single resource',
  },
  dateAdded: {
    message: 'Date added',
    context: "The date a resource was downloaded to a user's library",
  },
  noResourcesDownloaded: {
    message: 'You do not have any resources downloaded',
    context:
      'Message displayed a user looks at their My Downloads page, but has not yet downloaded any resources to the device',
  },
  removeResourceText: {
    message:
      "You will no longer be able to use this resource, but you can download it again later when it's available around you.",
    context:
      'Text displayed in a modal when a user decides to remove one downloaded resource from the device',
  },
  removeResourcesText: {
    message:
      'You will no longer be able to use these resources, but you can download them again later when they are available around you.',
    context:
      'Text displayed in a modal when a user decides to remove more than one downloaded resources from the device',
  },
  waitingToDownload: {
    message: 'Waiting to download',
    context: 'Text that displays the status of a resource the user has downloaded',
  },
  downloadStarted: {
    message: 'Download started',
    context: 'Text that displays the status of a resource the user has downloaded',
  },
  downloadedFailedWillRetry: {
    message: 'Download failed. Retrying in {minutes, number} minutes',
    context:
      'Text that displays the status of a resource the user has downloaded when the download has failed, but Kolibri is able to automatically try the download again.',
  },
  downloadedFailedCanNotRetry: {
    message: 'Download failed. Unable to retry.',
    context:
      'Text that displays the status of a resource the user has downloaded when the download has failed, and Kolibri is not able to automatically try the download again.',
  },
  deviceDisconnected: {
    message: 'Your device seems to be disconnected',
    context: '',
  },
  disconnected: {
    message: 'Disconnected',
    context: '',
  },
  addToLibrary: {
    message: 'Add to library',
    context: '',
  },
  selectADevice: {
    message: 'Select a device from your network',
  },
  //
  sortBy: {
    message: 'Sort by',
    context: '',
  },
  newestResource: {
    message: 'Newest',
    context: 'Label to filter by newest resource',
  },
  oldestResource: {
    message: 'Oldest',
    context: 'Label to filter by oldest resource',
  },
  largestFile: {
    message: 'Largest file size',
    context: 'Label to filter by largest file size',
  },
  smallestFile: {
    message: 'Smallest file size',
    context: 'Label to filter by smallest file size',
  },
  myLibrary: {
    message: 'My library',
    context: '',
  },
  showingYourLibrary: {
    message: 'Showing results from your library only',
    context: '',
  },

  // Device upgrades recommended
  userDevicesUsingIE11: {
    message: 'Some users seem to have accessed Kolibri via Internet Explorer 11',
    context:
      'Displayed to an admin, where devices on their network are using Internet Explorer 11, as part of a message encouraging the user to upgrade.',
  },
  browserSupportDroppedIE11: {
    message:
      'Please note that support for this browser has been dropped.  We recommend installing other browsers, such as Mozilla Firefox or Google Chrome, in order to continue working with Kolibri.',
    context:
      'Displayed to users of kolibri where one or more devices on the network are using Internet Explorer 11, as part of a message encouraging the user to upgrade.',
  },

  // Content activity
  notStartedLabel: {
    message: 'Not started',
    context: 'Refers to content that has not been viewed nor engaged with yet.',
  },
  folder: {
    message: 'Folder',
    context: "Tab label in the 'Browse channel' page that allows to navigate through its topics.",
  },
  folders: {
    message: 'Folders',
    context: "Tab label in the 'Browse channel' page that allows to navigate through its topics.",
  },
  scoreLabel: {
    message: 'Score',
    context:
      'Score obtained by a learner on a quiz, indicated by the percentage of correct answers given.',
  },
  // TODO - move these into diff sections as we make this a full feature in 0.16
  // Past Papers Project (12/2021) strings
  timeSpentLabel: {
    message: 'Time spent',
    context: 'The time a learner has spent on a quiz.',
  },
  suggestedTimeToComplete: {
    message: 'Suggested time to complete',
    context: 'Tooltip label indicating the approximate time needed to complete the resource.',
  },
  suggestedTime: {
    message: 'Suggested time',
    context: 'Time suggested by coach for how long an independent practice quiz should take',
  },
  statusLabel: {
    message: 'Status',
    context:
      'In a learner\'s independent practice quiz report, indicates if the practice quiz is "In progress" or "Completed"',
  },
  practiceQuizReportTitle: {
    message: 'Report for {quizTitle}',
    context: 'Label for a report corresponding to a practice quiz',
  },
  masteryModelLabel: {
    message: 'Completion requirement',
    context: 'Denotes whether a specific exercise needs to be completed by the learner.',
  },
  changeLearningFacility: {
    message: 'Change learning facility',
    context: 'Menu or screen used for the user to move to a different learning facility',
  },
  enterPinPlaceholder: {
    message: 'Enter PIN',
    context: 'Placholder text for the enter PIN textbox',
  },
  removePinPlacholder: {
    message: 'Remove PIN',
    context: 'Placholder text for the remove PIN textbox',
  },
  setPin: {
    message: 'Choose a 4-digit number to set as your new PIN',
    context: 'Label to allow user to choose numbers to set PIN',
  },
  numbersOnly: {
    message: 'Enter numbers only',
    context:
      'Error message indicating a user has entered characters other than numbers as their PIN',
  },
  wrongNumberOfDigits: {
    message: 'Please enter a 4-digit number',
    context: 'Error message indicating a user has entered the wrong number of digits as their PIN',
  },
  noEmptyField: {
    message: 'The field cannot be empty',
    context: 'Error message indicating a user has not added their PIN to the form field',
  },

  // preferred learning language and UI language
  preferredLanguage: {
    message: 'Preferred language',
    context:
      'Label for an setting where a user can select the language that they would like to learn in',
  },
  changePreferredLanguage: {
    message: 'Change preferred language',
    context:
      'Title for a modal where a user can select the language that they would like to learn in',
  },
  preferredLanguageHelperText: {
    message: 'Channels in the preferred language will be displayed first',
    context:
      'Explanatory text for the setting where a user can select the language that they would like to learn in',
  },
  changeLanguageOption: {
    message: 'Change language',
    context: "Option to change the Kolibri interface language on the  'Change language' screen.",
  },
  // getting started, pre-and-post-setup-wizard misc.

  // pre setup
  getStarted: {
    message: 'Get started',
    context: '',
  },
  learnWherever: {
    message: 'Learn wherever you are',
    context: '',
  },
  learnWhereverDescription: {
    message: 'Thousands of learning materials at your fingertips, completely offline',
    context: '',
  },
  goAtYourOwnPace: {
    message: 'Go at your own pace',
    context: '',
  },
  goAtYourOwnPaceDescription: {
    message: 'Track your own progress and use your learning materials as many times as you need',
    context: '',
  },
  exploreGlobalLibrary: {
    message: 'Explore a global library',
    context: '',
  },
  exploreGlobalLibraryDescription: {
    message: 'Find learning materials in over 170 languages',
    context: '',
  },
  neverPay: {
    message: 'Never pay to learn',
    context: '',
  },
  neverPayDescription: {
    message: 'Kolibri and its library will always be free of charge',
    context: '',
  },

  // setup wizard catch all
  whatLanguage: {
    message: 'What language do you want your learning materials to be in?',
    context: '',
  },
  whatLanguageDescription: {
    message: 'Kolibri will recommend materials in the language you select.',
    context: '',
  },
  currentLanguageLabel: {
    message: 'Language: {curentLanguage}',
    context: '',
  },
  superAdminAccountDescription: {
    message:
      'This is a super admin account that will let you manage resources and user accounts on this device.',
    context: '',
  },
  learningFacilityDescription: {
    message:
      'A learning facility represents the location where you are installing Kolibri, such as a school, training center, or your home.',
    context: '',
  },
  joinLearningFacility: {
    message: 'Join learning facility',
    context: '',
  },
  joinedSuccessfully: {
    message: "You have successfully joined the '{facility}' learning facility",
    context: '',
  },
  dontKnowUserName: {
    message: "Don't know the username?",
    context: '',
  },
  editAccountDetails: {
    message: 'Edit account details',
    context: '',
  },
  enterPassword: {
    message: 'Enter password',
    context: '',
  },

  // post setup
  preLoadedContentWelcomeText: {
    message:
      "Welcome to the '{facility}' learning facility. Your class materials can be found on the home page.",
    context: '',
  },
  channelsDescriptionNoChannelsAdded: {
    message:
      'Channels are collections of learning materials. Explore your network to start finding channels.',
  },
  nothingInLibraryLearner: {
    message:
      'There is nothing in your library yet. Explore libraries around you and start adding materials to your own.',
  },
  noNearbyFacilities: {
    message: 'There are no learning facilities around you right now',
    context: '',
  },

  changingStorageLocation: {
    message: 'Changing storage location',
    context: '',
  },
  showingLibrariesAroundYou: {
    message: 'Showing other libraries around you.',
    context: '',
  },
  noLibraries: {
    message: 'No libraries found around you.',
    context: '',
  },
  refresh: {
    message: 'Refresh',
    context: '',
  },
  addLearningMaterials: {
    message: 'Add learning materials',
    context: '',
  },
  addLearningMaterialsDescription: {
    message:
      'Choose materials to use on your device. You will also be able to add more whenever you are connected to the internet or there are other Kolibris around you.',
    context: '',
  },
  yourLibrary: {
    message: 'Your library',
    context: '',
  },
});

/**
 * An object mapping ad hoc keys (like those to be passed to coreString()) which do not
 * conform to the expectations. Examples:
 *
 * - Misspelling of the key in coreStrings but a kolibri-constant used to access it is
 *   spelled correctly and will not map.
 * - Keys were defined and string-froze which are not camelCase.
 * - Keys which, when _.camelCase()'ed will not result in a valid key, requiring manual mapping
 */
const nonconformingKeys = {
  PEERS: 'toUseWithPeers',
  TEACHER: 'toUseWithTeachers',
  PAPER_PENCIL: 'toUseWithPaperAndPencil',
  INTERNET: 'needsInternet',
  SPECIAL_SOFTWARE: 'needsSpecialSoftware',
  MATERIALS: 'needsMaterials',
  OTHER_SUPPLIES: 'needsMaterials',
  FOR_BEGINNERS: 'forBeginners',
  BASIC_SKILLS: 'allLevelsBasicSkills',
  FOUNDATIONS: 'basicSkills',
  foundations: 'basicSkills',
  foundationsLogicAndCriticalThinking: 'logicAndCriticalThinking',
};

/**
 * An object made by taking all metadata namespaces, merging them, then inverting them so that the
 * ID value (eg, 'rZy41Dc') instead are the keys of an object mapping to the names we use
 * to find the translation key.
 */
const MetadataLookup = invert(
  Object.assign(
    {},
    METADATA.AccessibilityCategories,
    METADATA.Categories,
    METADATA.ContentLevels,
    METADATA.ContentNodeResourceType,
    METADATA.LearningActivities,
    METADATA.ResourcesNeededTypes,
  ),
);

/**
 * Return translated string for key defined in the coreStrings translator. Will map
 * ID keys generated in the kolibri-constants library to their appropriate translations
 * if available.
 *
 * @param {string} key - A key as defined in the coreStrings translator; also accepts keys
 * for the object MetadataLookup.
 * @param {object} args - An object with keys matching ICU syntax arguments for the translation
 * string mapping to the values to be passed for those arguments.
 */
export function coreString(key, args) {
  const metadataKey = get(MetadataLookup, key, null);
  key = metadataKey ? camelCase(metadataKey) : key;

  if (nonconformingKeys[key]) {
    return coreStrings.$tr(nonconformingKeys[key], args);
  }

  if (nonconformingKeys[metadataKey]) {
    return coreStrings.$tr(nonconformingKeys[metadataKey], args);
  }

  return coreStrings.$tr(key, args);
}

export default {
  methods: {
    coreString,
    /**
     * Shows a specific snackbar notification from our notificationStrings translator.
     *
     * @param {string} key - A key as defined in the notificationsStrings translator.
     * @param {object} args - An object with keys matching ICU syntax arguments for the translation
     * string mapping to the values to be passed for those arguments.
     * @param {object} coreCreateSnackbarArgs - Arguments which will be passed to the
     * `CORE_CREATE_SNACKBAR` mutation.
     */
    showSnackbarNotification(key, args, coreCreateSnackbarArgs) {
      const { createSnackbar } = useSnackbar();
      const text = notificationStrings.$tr(key, args || {});
      if (coreCreateSnackbarArgs) {
        createSnackbar({
          ...coreCreateSnackbarArgs,
          text,
        });
      } else {
        createSnackbar(text);
      }
    },
  },
};

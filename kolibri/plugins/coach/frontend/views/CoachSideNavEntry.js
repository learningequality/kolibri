import { createTranslator } from 'kolibri/utils/i18n';
import { registerNavItem } from 'kolibri/composables/useNav';
import urls from 'kolibri/urls';
import { UserKinds } from 'kolibri/constants';
import plugin_data from 'kolibri-plugin-data';
import baseRoutes from '../routes/baseRoutes';

const navStrings = createTranslator('CoachSideNavEntryStrings', {
  classHome: {
    message: 'Class home',
    context:
      'The main section where the coach can see all the information relating to a specific class.',
  },
  coachLabel: {
    message: 'Coach',
    context:
      'A coach is a specific type of user in Kolibri who can manage classes and learners. A coach can be either a class coach or a facility coach.',
  },
  coursesLabel: {
    message: 'Courses',
    context: 'Label for courses that contain units and lessons.',
  },
  groupsLabel: {
    message: 'Groups',
    context:
      'A group is a collection of learners created by a coach inside a class to help with differentiated learning. Quizzes and lessons can be assigned to individual groups as well as to the whole class.',
  },
  learnersLabel: {
    message: 'Learners',
    context:
      'Learner is an account type that has limited permissions. Learners can be enrolled in classes, get assigned resources through lessons and quizzes, and navigate channels directly. We intentionally did not use the term "student" to be more inclusive of non-formal educational contexts.',
  },
  lessonsLabel: {
    message: 'Lessons',
    context:
      'A lesson is a linear learning pathway defined by a coach. The coach can select resources from any channel, add them to the lesson, define the ordering, and assign the lesson to learners in their class.',
  },
  quizzesLabel: {
    message: 'Quizzes',
    context: 'Plural of quiz.',
  },
});

registerNavItem({
  get url() {
    return urls['kolibri:kolibri.plugins.coach:coach']();
  },
  get routes() {
    const _routes = [
      {
        label: navStrings.$tr('classHome'),
        route: baseRoutes.classHome.path,
        icon: 'dashboard',
        name: baseRoutes.classHome.name,
      },
      {
        label: navStrings.$tr('lessonsLabel'),
        route: baseRoutes.lessons.path,
        icon: 'lesson',
        name: baseRoutes.lessons.name,
      },
      {
        label: navStrings.$tr('quizzesLabel'),
        route: baseRoutes.quizzes.path,
        icon: 'quiz',
        name: baseRoutes.quizzes.name,
      },
      {
        label: navStrings.$tr('learnersLabel'),
        route: baseRoutes.learners.path,
        icon: 'person',
        name: baseRoutes.learners.name,
      },
      {
        label: navStrings.$tr('groupsLabel'),
        route: baseRoutes.groups.path,
        icon: 'group',
        name: baseRoutes.groups.name,
      },
    ];

    if (plugin_data.courses_exist) {
      // Insert 'Courses' nav item just after 'Class Home'
      _routes.splice(1, 0, {
        label: navStrings.$tr('coursesLabel'),
        route: baseRoutes.courses.path,
        icon: 'lesson',
        name: baseRoutes.courses.name,
      });
    }

    return _routes;
  },
  get label() {
    return navStrings.$tr('coachLabel');
  },
  icon: 'coach',
  role: UserKinds.COACH,
  fullFacilityOnly: true,
});

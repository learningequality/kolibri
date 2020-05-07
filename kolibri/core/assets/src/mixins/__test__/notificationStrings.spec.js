import NotificationStrings from '../notificationStrings';

describe('Coach Notification Strings', () => {
  const pluralTestCases = [
    // [key, args, expected plural, expected singular]
    ['learnersEnrolledNoCount', { count: 10 }, 'Learners enrolled', 'Learner enrolled'],
    ['learnersRemovedNoCount', { count: 10 }, 'Learners removed', 'Learner removed'],
    ['learnersEnrolledWithCount', { count: 10 }, '10 learners enrolled', '1 learner enrolled'],
    ['learnersRemovedWithCount', { count: 10 }, '10 learners removed', '1 learner removed'],
    ['resourcesAddedWithCount', { count: 10 }, '10 resources added', '1 resource added'],
    ['resourcesRemovedWithCount', { count: 10 }, '10 resources removed', '1 resources removed'],
    ['coachesAssignedNoCount', { count: 10 }, 'Coaches assigned', 'Coach assigned'],
    ['coachesRemovedNoCount', { count: 10 }, 'Coaches removed', 'Coach removed'],
  ];
  test.each(pluralTestCases)(
    'Plural and singular versions of %s are displayed correctly',
    (key, args, expectedPlural, expectedSingular) => {
      expect(NotificationStrings.$tr(key, { count: 10 })).toEqual(expectedPlural);
      expect(NotificationStrings.$tr(key, { count: 1 })).toEqual(expectedSingular);
    }
  );
});

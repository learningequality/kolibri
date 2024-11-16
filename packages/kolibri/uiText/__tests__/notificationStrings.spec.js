import NotificationStrings from '../notificationStrings';

describe('Coach Notification Strings', () => {
  const pluralTestCases = [
    // [key, args, expected plural, expected singular]
    ['learnersEnrolledNoCount', 'Learners enrolled', 'Learner enrolled'],
    ['learnersRemovedNoCount', 'Learners removed', 'Learner removed'],
    ['learnersEnrolledWithCount', '10 learners enrolled', '1 learner enrolled'],
    ['learnersRemovedWithCount', '10 learners removed', '1 learner removed'],
    ['resourcesAddedWithCount', '10 resources added', '1 resource added'],
    ['resourcesRemovedWithCount', '10 resources removed', '1 resource removed'],
    ['resourcesAddedNoCount', 'Resources added', 'Resource added'],
    ['resourcesRemovedNoCount', 'Resources removed', 'Resource removed'],
    ['coachesAssignedNoCount', 'Coaches assigned', 'Coach assigned'],
    ['coachesRemovedNoCount', 'Coaches removed', 'Coach removed'],
  ];
  test.each(pluralTestCases)(
    'Plural and singular versions of %s are displayed correctly',
    (key, expectedPlural, expectedSingular) => {
      expect(NotificationStrings.$tr(key, { count: 10 })).toEqual(expectedPlural);
      expect(NotificationStrings.$tr(key, { count: 1 })).toEqual(expectedSingular);
    },
  );

  // Test that the rest of the messages don't need paramaters
  it('The other notification strings do not require params', () => {
    const paramMsgs = pluralTestCases.map(([key]) => key);
    Object.keys(NotificationStrings._defaultMessages).forEach(key => {
      if (paramMsgs.includes(key)) {
        expect(() => {
          NotificationStrings.$tr(key);
        }).toThrow();
      } else {
        expect(() => {
          NotificationStrings.$tr(key);
        }).not.toThrow();
      }
    });
  });
});

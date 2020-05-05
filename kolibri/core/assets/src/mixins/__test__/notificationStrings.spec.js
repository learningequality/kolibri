import NotificationStrings from '../notificationStrings';

describe('Coach Notification Strings', () => {
  const testCases = [
    // [key, args, expected]
    // plural
    ['learnersEnrolledNoCount', { count: 10 }, 'Learners enrolled'],
    ['learnersRemovedNoCount', { count: 10 }, 'Learners removed'],
    ['learnersEnrolledWithCount', { count: 10 }, '10 learners enrolled'],
    ['learnersRemovedWithCount', { count: 10 }, '10 learners removed'],
    ['resourcesAddedWithCount', { count: 10 }, '10 resources added'],
    ['resourcesRemovedWithCount', { count: 10 }, '10 resources removed'],
    // singular
    ['learnersEnrolledNoCount', { count: 1 }, 'Learner enrolled'],
    ['learnersRemovedNoCount', { count: 1 }, 'Learner removed'],
    ['learnersEnrolledWithCount', { count: 1 }, '1 learner enrolled'],
    ['learnersRemovedWithCount', { count: 1 }, '1 learner removed'],
    ['resourcesAddedWithCount', { count: 1 }, '1 resource added'],
    ['resourcesRemovedWithCount', { count: 1 }, '1 resource removed'],
  ];
  test.each(testCases)('%s is displayed correctly', (key, args, expected) => {
    expect(NotificationStrings.$tr(key, args)).toEqual(expected);
  });
});

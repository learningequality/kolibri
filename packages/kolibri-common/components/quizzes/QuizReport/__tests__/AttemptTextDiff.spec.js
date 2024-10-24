import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import AttemptTextDiff from '../AttemptTextDiff.vue';

jest.mock('kolibri/composables/useUser');

const renderComponent = props => {
  return render(AttemptTextDiff, {
    props,
  });
};

const testCases = [
  {
    caseName: 'Second Person Perspective: Answer Improved',
    correct: 1,
    diff: 1,
    userId: 'mockUser1',
    expectedMessage: 'You improved your incorrect answer from the previous attempt',
  },
  {
    caseName: 'Second Person Perspective: Incorrect Answer',
    correct: 0,
    diff: 0,
    userId: 'mockUser1',
    expectedMessage: 'You also answered this incorrectly on the previous attempt',
  },
  {
    caseName: 'Second Person Perspective: Correct Answer',
    correct: 0,
    diff: -1,
    userId: 'mockUser1',
    expectedMessage: 'You answered this correctly on the previous attempt',
  },
  {
    caseName: 'Third Person Perspective: Answer Improved',
    correct: 1,
    diff: 1,
    userId: 'mockUser2',
    expectedMessage: 'Learner improved their incorrect answer from the previous attempt',
  },
  {
    caseName: 'Third Person Perspective: Incorrect Answer',
    correct: 0,
    diff: 0,
    userId: 'mockUser2',
    expectedMessage: 'Learner also answered this incorrectly on the previous attempt',
  },
  {
    caseName: 'Third Person Perspective: Correct Answer',
    correct: 0,
    diff: -1,
    userId: 'mockUser2',
    expectedMessage: 'Learner answered this correctly on the previous attempt',
  },
];

describe('AttemptTextDiff', () => {
  beforeAll(() => {
    useUser.mockImplementation(() => useUserMock({ currentUserId: 'mockUser1' }));
  });

  testCases.forEach(({ caseName, correct, diff, userId, expectedMessage }) => {
    test(caseName, () => {
      renderComponent({ correct, diff, userId });
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    });
  });

  test('No text is shown when the props are invalid', () => {
    renderComponent({ correct: 1, diff: 0, userId: 'mockUser1' });
    expect(screen.queryByTestId('attempt-text-diff')).not.toBeInTheDocument();
  });
});

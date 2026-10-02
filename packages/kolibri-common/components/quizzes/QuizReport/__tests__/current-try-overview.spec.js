import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import CurrentTryOverview from '../CurrentTryOverview';

jest.mock('kolibri/composables/useUser');

const translator = createTranslator('CurrentTryOverview', CurrentTryOverview.$trs);

/* A pair of timestamps in the past, in ascending chronological order
 * used for bootstrapping a try, timestamp logic below */
const pastTimestamps = ['2002-01-10T16:00:43.926864-08:00', '2002-01-11T16:00:43.926864-08:00'];

const defaultTry = {
  id: 'try',
  mastery_criterion: { type: 'quiz' },
  start_timestamp: pastTimestamps[0],
  end_timestamp: pastTimestamps[1],
  completion_timestamp: pastTimestamps[1],
  time_spent: 1000, // A long while
  correct: 2,
  diff: null,
  complete: true,
  attemptLogs: [],
};

const defaultProps = {
  currentTry: defaultTry,
  totalQuestions: 10,
  hideStatus: false,
  userId: 'user-1',
  isSurvey: false,
};

const betterDiff = {
  time_spent: -40,
  correct: 4,
};

/* The time_spent needs to be > 60 because it's only used when the diff is > 60s */
const worseDiff = {
  time_spent: 80,
  correct: 0,
};

/**
 * Returns defaultProps but you can pass overrides. If you want to override try only, pass
 * an empty object in the first param position.
 * @param {object} [propOverrides] - Component prop overrides; takes precedence over the
 * defaults.
 * @param {object} [tryOverrides] - Overrides applied to `defaultTry`. A `currentTry` key
 * on `propOverrides` will override the merged try.
 * @returns {object} Merged props ready to pass to the component under test.
 */
function defaultPropsWith(propOverrides = {}, tryOverrides = {}) {
  return Object.assign(
    {},
    defaultProps,
    { currentTry: Object.assign({}, defaultTry, tryOverrides) },
    propOverrides,
  );
}

// Useful to ensure masteryModel computed comes back non-falsy when needed
const nonQuizValidMasteryCriterion = { type: 'm_of_n', m: 5, n: 7 };

const renderComponent = props => {
  return render(CurrentTryOverview, {
    props,
  });
};

describe('ExamReport/CurrentTryOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock());
  });

  describe('status', () => {
    it('shows a ProgressIcon when hideStatus is false', () => {
      renderComponent(defaultProps);
      expect(screen.getByTestId('try-status')).toBeInTheDocument();
    });

    it('shows nothing when hideStatus is true', () => {
      renderComponent(defaultPropsWith({ hideStatus: true }));
      expect(screen.queryByTestId('try-status')).not.toBeInTheDocument();
    });
  });

  describe('mastery model', () => {
    it('shows a MasteryModel component when computed masterModel is truthy', () => {
      renderComponent(defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }));
      expect(screen.getByTestId('try-mastery-model')).toBeInTheDocument();
    });

    it('shows nothing when masteryModel computed is null', () => {
      // We know it is null due to the test suite describing 'is null when ... is "quiz"'
      renderComponent(defaultProps);
      expect(screen.queryByTestId('try-mastery-model')).not.toBeInTheDocument();
    });

    it('shows nothing when isSurvey', () => {
      renderComponent(
        defaultPropsWith({ isSurvey: true }, { mastery_criterion: nonQuizValidMasteryCriterion }),
      );
      expect(screen.queryByTestId('try-mastery-model')).not.toBeInTheDocument();
    });
  });

  describe('percentage score', () => {
    describe('not displaying the score', () => {
      it('is not shown if computed masteryModel is truthy', () => {
        renderComponent(defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }));
        expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
      });

      it('is not shown if currentTry.correct is `undefined`', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({}, { correct: undefined }));
        expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
      });

      it('is not shown when the prop isSurvey is true', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({ isSurvey: true }));
        expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
      });
    });

    it('shows the value of computed score as a %', () => {
      const cases = [0, 2, 5, 10];
      cases.forEach(n => {
        const { unmount } = renderComponent(defaultPropsWith({}, { correct: n }));
        const expectedPct = Math.round((n / defaultProps.totalQuestions) * 100);
        expect(screen.getByTestId('try-score')).toHaveTextContent(`${expectedPct}%`);
        unmount();
      });
    });
  });

  describe('questions correct', () => {
    describe('not displaying the questions correct', () => {
      it('is not shown if computed masteryModel is truthy', () => {
        renderComponent(defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }));
        expect(screen.queryByTestId('try-questions-correct')).not.toBeInTheDocument();
      });

      it('is not shown if currentTry.correct is `undefined`', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({}, { correct: undefined }));
        expect(screen.queryByTestId('try-questions-correct')).not.toBeInTheDocument();
      });

      it('is not shown when the prop isSurvey is true', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({ isSurvey: true }));
        expect(screen.queryByTestId('try-questions-correct')).not.toBeInTheDocument();
      });
    });

    describe('showing the questions correct fraction', () => {
      /* Display logic */
      it('is shown when currentTry.correct and prop totalQuestions are set', () => {
        renderComponent(defaultProps);
        expect(screen.getByTestId('try-questions-correct')).toBeInTheDocument();
      });

      it('displays annotation string when diff.correct is set and viewed by owning user', () => {
        useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
        renderComponent(defaultPropsWith({}, { diff: betterDiff }));
        expect(screen.getByTestId('try-questions-correct')).toHaveTextContent(
          translator.$tr('practiceQuizReportImprovedLabelSecondPerson', {
            value: betterDiff.correct,
          }),
        );
      });
    });
  });

  describe('time spent', () => {
    it('is not shown when the prop isSurvey is true', () => {
      renderComponent(defaultPropsWith({ isSurvey: true }));
      expect(screen.queryByTestId('try-time-spent')).not.toBeInTheDocument();
    });

    it('is not shown when currentTry.time_spent is falsy', () => {
      renderComponent(defaultPropsWith({}, { time_spent: 0 }));
      expect(screen.queryByTestId('try-time-spent')).not.toBeInTheDocument();
    });

    it('displays a TimeDuration component representation', () => {
      renderComponent(defaultProps);
      expect(screen.getByTestId('try-time-spent')).toBeInTheDocument();
    });

    describe('showing the time spent annotation', () => {
      describe('diffTimeSpent < 0 - try is faster than last', () => {
        it('displays $trs.practiceQuizReportFasterTimeLabel with the abs value of diffTimeSpent', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          renderComponent(defaultPropsWith({}, { diff: betterDiff }));
          const diffTime = Math.abs(Math.floor(betterDiff.time_spent / 60));
          expect(screen.getByTestId('try-time-spent')).toHaveTextContent(
            translator.$tr('practiceQuizReportFasterTimeLabel', {
              value: diffTime,
            }),
          );
        });
      });

      describe('diffTimeSpent > 0 try is slower than last', () => {
        it('displays $trs.practiceQuizReportSlowerTimeLabel with the value of diffTimeSpent', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          renderComponent(defaultPropsWith({}, { diff: worseDiff }));
          const diffTime = Math.floor(worseDiff.time_spent / 60);
          expect(screen.getByTestId('try-time-spent')).toHaveTextContent(
            translator.$tr('practiceQuizReportSlowerTimeLabel', {
              value: diffTime,
            }),
          );
        });
      });
    });
  });

  describe('time ago', () => {
    it('displays ElapsedTime component representation', () => {
      renderComponent(defaultProps);
      expect(screen.getByTestId('try-attempted-ago')).toBeInTheDocument();
    });
  });
});

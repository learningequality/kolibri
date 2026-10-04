import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import CurrentTryOverview from '../CurrentTryOverview';

const { statusLabel$, masteryModelLabel$, scoreLabel$, questionsCorrectLabel$, timeSpentLabel$ } =
  coreStrings;

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
    it('shows the current status of the try when hideStatus is false', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(statusLabel$())).toBeInTheDocument();
    });

    it('shows nothing when hideStatus is true', () => {
      renderComponent(defaultPropsWith({ hideStatus: true }));
      expect(screen.queryByText(statusLabel$())).not.toBeInTheDocument();
    });
  });

  describe('mastery model', () => {
    it('shows the mastery model when the try has one', () => {
      renderComponent(defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }));
      expect(screen.getByText(masteryModelLabel$())).toBeInTheDocument();
    });

    it('does not show the mastery model for quizzes', () => {
      // defaultTry has mastery_criterion { type: 'quiz' }.
      renderComponent(defaultProps);
      expect(screen.queryByText(masteryModelLabel$())).not.toBeInTheDocument();
    });

    it('shows nothing when isSurvey', () => {
      renderComponent(
        defaultPropsWith({ isSurvey: true }, { mastery_criterion: nonQuizValidMasteryCriterion }),
      );
      expect(screen.queryByText(masteryModelLabel$())).not.toBeInTheDocument();
    });
  });

  describe('percentage score', () => {
    describe('not displaying the score', () => {
      it('is not shown when the try has a mastery model', () => {
        renderComponent(defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }));
        expect(screen.queryByText(scoreLabel$())).not.toBeInTheDocument();
      });

      it('is not shown if currentTry.correct is `undefined`', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({}, { correct: undefined }));
        expect(screen.queryByText(scoreLabel$())).not.toBeInTheDocument();
      });

      it('is not shown when the prop isSurvey is true', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({ isSurvey: true }));
        expect(screen.queryByText(scoreLabel$())).not.toBeInTheDocument();
      });
    });

    it.each([0, 2, 5, 10])('shows %i of 10 correct as a percentage', n => {
      renderComponent(defaultPropsWith({}, { correct: n }));
      const expectedPct = Math.round((n / defaultProps.totalQuestions) * 100);
      expect(screen.getByText(scoreLabel$()).closest('tr')).toHaveTextContent(`${expectedPct}%`);
    });
  });

  describe('questions correct', () => {
    describe('not displaying the questions correct', () => {
      it('is not shown when the try has a mastery model', () => {
        renderComponent(defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }));
        expect(screen.queryByText(questionsCorrectLabel$())).not.toBeInTheDocument();
      });

      it('is not shown if currentTry.correct is `undefined`', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({}, { correct: undefined }));
        expect(screen.queryByText(questionsCorrectLabel$())).not.toBeInTheDocument();
      });

      it('is not shown when the prop isSurvey is true', () => {
        // Aside from the overridden prop, this would have shown
        renderComponent(defaultPropsWith({ isSurvey: true }));
        expect(screen.queryByText(questionsCorrectLabel$())).not.toBeInTheDocument();
      });
    });

    describe('showing the questions correct fraction', () => {
      /* Display logic */
      it('is shown when currentTry.correct and prop totalQuestions are set', () => {
        renderComponent(defaultProps);
        expect(screen.getByText(questionsCorrectLabel$())).toBeInTheDocument();
      });

      it('displays annotation string when diff.correct is set and viewed by owning user', () => {
        useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
        renderComponent(defaultPropsWith({}, { diff: betterDiff }));
        expect(screen.getByText(questionsCorrectLabel$()).closest('tr')).toHaveTextContent(
          translator.$tr('practiceQuizReportImprovedLabelSecondPerson', {
            value: betterDiff.correct,
          }),
        );
      });

      it('does not display annotation string when viewed by another user', () => {
        useUser.mockImplementation(() => useUserMock({ currentUserId: 'other' }));
        renderComponent(defaultPropsWith({}, { diff: betterDiff }));
        expect(screen.getByText(questionsCorrectLabel$()).closest('tr')).not.toHaveTextContent(
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
      expect(screen.queryByText(timeSpentLabel$())).not.toBeInTheDocument();
    });

    it('is not shown when currentTry.time_spent is falsy', () => {
      renderComponent(defaultPropsWith({}, { time_spent: 0 }));
      expect(screen.queryByText(timeSpentLabel$())).not.toBeInTheDocument();
    });

    it('shows the total time spent on the try', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(timeSpentLabel$())).toBeInTheDocument();
    });

    describe('showing the time spent annotation', () => {
      describe('diffTimeSpent < 0 - try is faster than last', () => {
        it('displays $trs.practiceQuizReportFasterTimeLabel with the abs value of diffTimeSpent', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          renderComponent(defaultPropsWith({}, { diff: betterDiff }));
          const diffTime = Math.abs(Math.floor(betterDiff.time_spent / 60));
          expect(screen.getByText(timeSpentLabel$()).closest('tr')).toHaveTextContent(
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
          expect(screen.getByText(timeSpentLabel$()).closest('tr')).toHaveTextContent(
            translator.$tr('practiceQuizReportSlowerTimeLabel', {
              value: diffTime,
            }),
          );
        });
      });

      describe('sub-minute time diffs (magnitude < 60s)', () => {
        it('displays no annotation', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          renderComponent(defaultPropsWith({}, { diff: { time_spent: 40 } }));
          // Since the difference is less than 60s, it rounds to 0 minutes,
          // which shouldn't show the label. We also assert value 1
          // is absent to catch Math.ceil bugs.
          const row = screen.getByText(timeSpentLabel$()).closest('tr');
          [0, 1].forEach(val => {
            expect(row).not.toHaveTextContent(
              translator.$tr('practiceQuizReportFasterTimeLabel', { value: val }),
            );
            expect(row).not.toHaveTextContent(
              translator.$tr('practiceQuizReportSlowerTimeLabel', { value: val }),
            );
          });
        });
      });
    });
  });

  describe('time ago', () => {
    it('shows how long ago the try was attempted', () => {
      renderComponent(defaultProps);
      expect(screen.getByText(translator.$tr('attemptedLabel'))).toBeInTheDocument();
    });
  });
});

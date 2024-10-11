import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import { createTranslator } from 'kolibri/utils/i18n';
import ElapsedTime from 'kolibri-common/components/ElapsedTime';
import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';
import TimeDuration from 'kolibri-common/components/TimeDuration';
import MasteryModel from 'kolibri-common/components/labels/MasteryModel';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import CurrentTryOverview from '../CurrentTryOverview';

const localVue = createLocalVue();
localVue.use(Vuex);

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
 * @param propOverrides - will take precence
 * @param tryOverrides - will override defaultTry (but propOverrides with a currentTry key
 *  will override *that*
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

describe('ExamReport/CurrentTryOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock());
  });

  describe('status', () => {
    it('shows a ProgressIcon when hideStatus is false', () => {
      const wrapper = shallowMount(CurrentTryOverview, { propsData: defaultProps });
      expect(wrapper.findComponent(ProgressIcon)).toBeTruthy();
    });

    it('shows nothing when hideStatus is true', async () => {
      const wrapper = shallowMount(CurrentTryOverview, {
        propsData: defaultPropsWith({ hideStatus: true }),
      });
      expect(wrapper.find('[data-test="try-status"]').element).toBeFalsy();
    });
  });

  describe('mastery model', () => {
    const wrapperToShowMasteryModel = shallowMount(CurrentTryOverview, {
      propsData: defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }),
    });

    // Incl { mastery_criterion: { type: 'quiz' } } which should hide this section and cause
    // computed masteryModel to return null
    const wrapperWithoutMasteryModel = shallowMount(CurrentTryOverview, {
      propsData: defaultProps,
    });

    describe('computed masteryModel', () => {
      // mastery_criterion: null fails tryValidator so it cannot
      // be tested, but the same should happen with {}
      it('is null when currentTry prop has no mastery_criterion', () => {
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { mastery_criterion: {} }),
        });
        expect(wrapper.vm.masteryModel).toBeNull();
      });

      it('is null when currentTry.mastery_criterion.type is "quiz"', () => {
        expect(wrapperWithoutMasteryModel.vm.masteryModel).toBeNull();
      });

      it('returns currentTry.mastery_criterion otherwise', () => {
        expect(wrapperToShowMasteryModel.vm.masteryModel).toEqual(nonQuizValidMasteryCriterion);
      });
    });

    it('shows a MasteryModel component when computed masterModel is truthy', () => {
      expect(wrapperToShowMasteryModel.findComponent(MasteryModel)).toBeTruthy();
    });

    it('shows nothing when masteryModel computed is null', () => {
      // We know it is null due to the test suite describing 'is null when ... is "quiz"' - which
      // is what wrapperWithoutMasteryModel has it's currentTry.mastery_criterion set to
      expect(
        wrapperWithoutMasteryModel.find('[data-test="try-mastery-model"]').element,
      ).toBeFalsy();
    });

    it('shows nothing when isSurvey', async () => {
      // setProps is async
      await wrapperToShowMasteryModel.setProps({ isSurvey: true });
      expect(wrapperToShowMasteryModel.find('[data-test="try-mastery-model"]').element).toBeFalsy();
    });
  });

  describe('percentage score', () => {
    describe('computed score', () => {
      it('returns 0 when currentTry.correct is falsy', () => {
        let wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { correct: undefined }),
        });
        expect(wrapper.vm.score).toEqual(0);

        wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { correct: null }),
        });
        expect(wrapper.vm.score).toEqual(0);
      });

      const wrapper = shallowMount(CurrentTryOverview, { propsData: defaultProps });
      it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 49])(
        `returns currentTry.correct (%i) / this.totalQuestions (${defaultProps.totalQuestions})`,
        n => {
          wrapper.setProps(defaultPropsWith({}, { correct: n }));
          return wrapper.vm.$nextTick().then(() => {
            expect(wrapper.vm.score).toEqual(n / defaultProps.totalQuestions);
          });
        },
      );
    });

    describe('not displaying the score', () => {
      it('is not shown if computed masteryModel is truthy', () => {
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }),
        });
        expect(wrapper.find('[data-test="try-score"]').element).toBeFalsy();
      });

      it('is not shown if currentTry.correct is `undefined`', () => {
        // Aside from the overridden prop, this would have shown
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { correct: undefined }),
        });
        expect(wrapper.find('[data-test="try-score"]').element).toBeFalsy();
      });

      it('is not shown when the prop isSurvey is true', () => {
        // Aside from the overridden prop, this would have shown
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({ isSurvey: true }),
        });
        expect(wrapper.find('[data-test="try-score"]').element).toBeFalsy();
      });
    });

    it('shows the value of computed score as a %', () => {
      const wrapper = shallowMount(CurrentTryOverview, {
        propsData: defaultProps,
      });
      it.each(
        [0, 1, 10, 50, 75, 100],
        'displays %i as a percentage when currentTry.correct = %i',
        async n => {
          await wrapper.setProps({ currentTry: { ...defaultTry, correct: n } });
          expect(wrapper.find('[data-test="try-score"]').toHaveTextContent(`${n}%`));
        },
      );
    });
  });

  describe('questions correct', () => {
    describe('not displaying the questions correct', () => {
      it('is not shown if computed masteryModel is truthy', () => {
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { mastery_criterion: nonQuizValidMasteryCriterion }),
        });
        expect(wrapper.find('[data-test="try-questions-correct"]').element).toBeFalsy();
      });

      it('is not shown if currentTry.correct is `undefined`', () => {
        // Aside from the overridden prop, this would have shown
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { correct: undefined }),
        });
        expect(wrapper.find('[data-test="try-questions-correct"]').element).toBeFalsy();
      });

      it('is not shown when the prop isSurvey is true', () => {
        // Aside from the overridden prop, this would have shown
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({ isSurvey: true }),
        });
        expect(wrapper.find('[data-test="try-questions-correct"]').element).toBeFalsy();
      });
    });

    describe('showing the questions correct fraction', () => {
      /* Testing a relevant computed property before getting to the display logic */
      describe('computed questionsCorrectAnnotation', () => {
        describe('currentTry.diff.correct > 0 and user viewing own try', () => {
          /* This would be an $tr, at current 'practiceQuizReportImprovedLabelSecondPerson': */
          it('returns a string including currentTry.diff.correct in it', () => {
            useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
            const wrapper = shallowMount(CurrentTryOverview, {
              propsData: defaultPropsWith({}, { diff: betterDiff }),
              localVue,
            });

            expect(wrapper.vm.questionsCorrectAnnotation).toEqual(
              translator.$tr('practiceQuizReportImprovedLabelSecondPerson', {
                value: betterDiff.correct,
              }),
            );
          });
        });

        it('returns null when currentTry.diff is falsy', () => {
          const wrapper = shallowMount(CurrentTryOverview, {
            propsData: defaultProps,
          });
          expect(wrapper.vm.questionsCorrectAnnotation).toBeNull();
        });

        it("returns null when the try is not the current user's try", () => {
          useUser.mockImplementation(() =>
            useUserMock({ currentUserId: defaultProps.userId + '-2-3' }),
          );
          const wrapper = shallowMount(CurrentTryOverview, {
            propsData: defaultPropsWith({}, { diff: betterDiff }),
            localVue,
          });
          expect(wrapper.vm.questionsCorrectAnnotation).toBeNull();
        });
      });

      /* Display logic */
      it('is shown when currentTry.correct and prop totalQuestions are set', () => {
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultProps,
        });
        expect(wrapper.find('[data-test="try-questions-correct"]').element).toBeTruthy();
      });

      it('displays annotation string when diff.correct is set and viewed by owning user', () => {
        useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({}, { diff: betterDiff }),
          localVue,
        });
        expect(wrapper.find('[data-test="try-questions-correct"]').element).toHaveTextContent(
          translator.$tr('practiceQuizReportImprovedLabelSecondPerson', {
            value: betterDiff.correct,
          }),
        );
      });
    });
  });

  describe('time spent', () => {
    it('is not shown when the prop isSurvey is true', () => {
      const wrapper = shallowMount(CurrentTryOverview, {
        propsData: defaultPropsWith({ isSurvey: true }),
      });
      expect(wrapper.find('[data-test="try-time-spent"]').element).toBeFalsy();
    });

    it('is not shown when currentTry.time_spent is falsy', () => {
      const wrapper = shallowMount(CurrentTryOverview, {
        propsData: defaultPropsWith({}, { time_spent: 0 }),
      });
      expect(wrapper.find('[data-test="try-time-spent"]').element).toBeFalsy();
    });

    it('displays a TimeDuration component', () => {
      const wrapper = shallowMount(CurrentTryOverview, {
        propsData: defaultProps,
      });
      expect(wrapper.findComponent(TimeDuration)).toBeTruthy();
    });

    describe('showing the time spent annotation', () => {
      describe('computed diffTimeSpent', () => {
        useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
        it('returns null when currentTry.diff.time_spent is falsy', () => {
          const wrapper = shallowMount(CurrentTryOverview, {
            localVue,
            propsData: defaultPropsWith({}, { diff: { time_spent: 0 } }),
          });
          expect(wrapper.vm.diffTimeSpent).toBeNull();
        });

        it('returns Math.floor of currentTry.diff.time_spent / 60', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          const wrapper = shallowMount(CurrentTryOverview, {
            propsData: defaultPropsWith({}, { diff: betterDiff }),
            localVue,
          });
          expect(wrapper.vm.diffTimeSpent).toEqual(Math.floor(betterDiff.time_spent / 60));
        });
      });

      describe('computed timeSpentAnnotation', () => {
        it('returns null when currentTry.diff.time_spent is 0 < n < 60', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          const wrapper = shallowMount(CurrentTryOverview, {
            localVue,
            propsData: defaultPropsWith({}, { diff: { time_spent: 40 } }),
          });
          expect(wrapper.vm.timeSpentAnnotation).toBeNull();
        });

        it('returns null when currentTry.diff.time_spent is falsy', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          const wrapper = shallowMount(CurrentTryOverview, {
            localVue,
            propsData: defaultPropsWith({}, { diff: { time_spent: undefined } }),
          });
          expect(wrapper.vm.timeSpentAnnotation).toBeNull();
        });
      });

      describe('diffTimeSpent < 0 - try is faster than last', () => {
        it('displays $trs.practiceQuizReportFasterTimeLabel with the abs value of diffTimeSpent', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          const wrapper = shallowMount(CurrentTryOverview, {
            localVue,
            propsData: defaultPropsWith({}, { diff: betterDiff }),
          });
          expect(wrapper.find('[data-test="try-time-spent"]').element).toHaveTextContent(
            translator.$tr('practiceQuizReportFasterTimeLabel', {
              value: Math.abs(wrapper.vm.diffTimeSpent),
            }),
          );
        });
      });

      describe('diffTimeSpent > 0 try is slower than last', () => {
        it('displays $trs.practiceQuizReportSlowerTimeLabel with the value of diffTimeSpent', () => {
          useUser.mockImplementation(() => useUserMock({ currentUserId: defaultProps.userId }));
          const wrapper = shallowMount(CurrentTryOverview, {
            localVue,
            propsData: defaultPropsWith({}, { diff: worseDiff }),
          });
          expect(wrapper.find('[data-test="try-time-spent"]').element).toHaveTextContent(
            translator.$tr('practiceQuizReportSlowerTimeLabel', {
              value: wrapper.vm.diffTimeSpent,
            }),
          );
        });
      });
    });
  });

  describe('time ago', () => {
    describe('computed endTimestamp', () => {
      // Assumes that one of completion_timestamp OR end_timestamp exists on currentTry
      it('returns currentTry.completion_timestamp', () => {
        const wrapper = shallowMount(CurrentTryOverview, { propsData: defaultProps });
        expect(wrapper.vm.endTimestamp).toEqual(defaultProps.completion_timestamp);
      });
      it('returns currentTry.end_timestamp when .completion_timestamp is falsy', () => {
        const wrapper = shallowMount(CurrentTryOverview, {
          propsData: defaultPropsWith({ completion_timestamp: undefined }),
        });
        expect(wrapper.vm.endTimestamp).toEqual(defaultProps.end_timestamp);
      });
    });

    it('displays ElapsedTime component with `new Date(endTimestamp)` passed to its :date prop', () => {
      const wrapper = shallowMount(CurrentTryOverview, { propsData: defaultProps });
      expect(wrapper.findComponent(ElapsedTime)).toBeTruthy();
    });
    // Not testing the "don't show this" because there is no reason for BOTH to be undefined
    // so this should always be shown for now.
  });
});

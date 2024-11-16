import { mount } from '@vue/test-utils';
import AttemptLogItem from '../AttemptLogItem';

/* A JSON blob yanked from devtools that inclues questions data with correct and
 * incorrect answers.*/
import sampleAttemptLogs from './sample-attempt-logs.json';

describe('AttemptLogItem', () => {
  describe('when viewing a survey (isSurvey prop is true)', () => {
    it.each(
      sampleAttemptLogs, // Tests all of the sample logs
      'does not show icons for any questions regardless of their status',
      attemptLog => {
        const wrapper = mount(AttemptLogItem, {
          propsData: { isSurvey: true, attemptLog },
        });
        expect(wrapper.find('[data-test="question-attempt-icons"]').element).toBeFalsy();
      },
    );
  });

  describe('when not viewing a survey', () => {
    /* This could be made more robust by testing all questions and checking that the
     * status of each sample log shows the correct icon. Maybe if this ever needs to
     * change it would be worth covering the display logic a bit */
    it('shows icons indicating information about the status', () => {
      const wrapper = mount(AttemptLogItem, {
        propsData: { attemptLog: sampleAttemptLogs[0] },
      });
      expect(wrapper.find('[data-test="question-attempt-icons"]').element).toBeTruthy();
    });
  });
});

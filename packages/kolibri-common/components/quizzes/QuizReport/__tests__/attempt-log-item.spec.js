import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import AttemptLogItem from '../AttemptLogItem';

/* A JSON blob yanked from devtools that inclues questions data with correct and
 * incorrect answers.*/
import sampleAttemptLogs from './sample-attempt-logs.json';

describe('AttemptLogItem', () => {
  describe('when viewing a survey (isSurvey prop is true)', () => {
    it.each(
      sampleAttemptLogs,
      'does not show icons for any questions regardless of their status',
      attemptLog => {
        render(AttemptLogItem, {
          props: {
            isSurvey: true,
            attemptLog,
            questionNumber: 1,
            displayTag: 'span',
          },
        });
        expect(screen.queryByTestId('question-attempt-icons')).not.toBeInTheDocument();
      },
    );
  });

  describe('when not viewing a survey', () => {
    /* This could be made more robust by testing all questions and checking that the
     * status of each sample log shows the correct icon. Maybe if this ever needs to
     * change it would be worth covering the display logic a bit */
    it('shows icons indicating information about the status', () => {
      render(AttemptLogItem, {
        props: {
          isSurvey: false,
          attemptLog: sampleAttemptLogs[0],
          questionNumber: 1,
          displayTag: 'span',
        },
      });
      expect(screen.getByTestId('question-attempt-icons')).toBeInTheDocument();
    });
  });
});

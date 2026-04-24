import { MasteryThreshold, ScoreBucket } from '../constants/courseConstants';

/**
 * Classifies a learner's mastery for a learning objective based on their
 * correct count and total questions.
 * @param {number} correctCount - Number of questions answered correctly.
 * @param {number} numQuestions - Total questions for this LO.
 * @returns {string} ScoreBucket.LOW, ScoreBucket.MID, or ScoreBucket.HIGH.
 */
export function classifyLearnerMastery(correctCount, numQuestions) {
  const ratio = numQuestions > 0 ? correctCount / numQuestions : 0;
  if (ratio > MasteryThreshold.HIGH) return ScoreBucket.HIGH;
  if (ratio > MasteryThreshold.LOW) return ScoreBucket.MID;
  return ScoreBucket.LOW;
}

/**
 * Counts how many learners fall into each score bucket for a given learning objective.
 * @param {object} scores - Map of learner IDs to their correct counts per learning objective ID.
 * @param {string} loId - The learning objective ID to bucket scores for.
 * @param {number} numQuestions - Total number of questions for the learning objective.
 * @returns {object} An object with lowCount, midCount, and highCount properties.
 */
export function bucketScoresForObjective(scores, loId, numQuestions) {
  let lowCount = 0;
  let midCount = 0;
  let highCount = 0;

  for (const learnerId of Object.keys(scores)) {
    const correctCount = scores[learnerId][loId] || 0;
    const bucket = classifyLearnerMastery(correctCount, numQuestions);

    if (bucket === ScoreBucket.HIGH) {
      highCount++;
    } else if (bucket === ScoreBucket.MID) {
      midCount++;
    } else {
      lowCount++;
    }
  }

  return { lowCount, midCount, highCount };
}

/**
 * Buckets scores for all learning objectives in a unit.
 * @param {Array} learningObjectives - Learning objective objects with id, text, and num_questions.
 * @param {object} scores - Map of learner IDs to their correct counts per learning objective ID.
 * @returns {Array} Learning objective objects with lowCount, midCount, and highCount added.
 */
export function bucketAllObjectives(learningObjectives, scores) {
  return learningObjectives.map(lo => {
    const { lowCount, midCount, highCount } = bucketScoresForObjective(
      scores,
      lo.id,
      lo.num_questions,
    );
    return {
      id: lo.id,
      text: lo.text,
      numQuestions: lo.num_questions,
      lowCount,
      midCount,
      highCount,
    };
  });
}

/**
 * Derives summary information about a unit report, including active test and bucketed objectives.
 * @param {object} reportData - Unit report data with post_test, pre_test, and learning_objectives.
 * @returns {object} An object with activeTestType, activeTestStatus, and bucketedObjectives.
 */
export function deriveUnitReportInfo(reportData) {
  const { post_test, pre_test, learning_objectives } = reportData;
  let activeTest = null;
  let activeTestType = null;

  if (post_test.status !== 'not_activated') {
    activeTest = post_test;
    activeTestType = 'post';
  } else if (pre_test.status !== 'not_activated') {
    activeTest = pre_test;
    activeTestType = 'pre';
  }

  return {
    activeTestType,
    activeTestStatus: activeTest?.status || 'not_activated',
    bucketedObjectives: activeTest
      ? bucketAllObjectives(learning_objectives, activeTest.scores)
      : [],
  };
}

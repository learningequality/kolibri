import { MasteryThreshold, ScoreBucket } from '../constants/courseConstants';

/**
 * Classifies a learner's mastery for a learning objective based on their
 * correct count and total questions.
 *
 * @param {number} correctCount - number of questions answered correctly
 * @param {number} numQuestions - total questions for this LO
 * @returns {string} ScoreBucket.LOW, ScoreBucket.MID, or ScoreBucket.HIGH
 */
export function classifyLearnerMastery(correctCount, numQuestions) {
  const ratio = numQuestions > 0 ? correctCount / numQuestions : 0;
  if (ratio > MasteryThreshold.HIGH) return ScoreBucket.HIGH;
  if (ratio > MasteryThreshold.LOW) return ScoreBucket.MID;
  return ScoreBucket.LOW;
}

/**
 * Buckets learner scores for a single learning objective into low/mid/high counts.
 *
 * @param {Object} scores - { learnerId: { loId: correctCount, ... }, ... }
 * @param {string} loId - the learning objective ID
 * @param {number} numQuestions - total questions for this LO
 * @returns {{ lowCount: number, midCount: number, highCount: number }}
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
 * Maps over an array of learning objectives and returns bucketed results for each.
 *
 * @param {Array<{ id: string, text: string, num_questions: number }>} learningObjectives
 * @param {Object} scores - { learnerId: { loId: correctCount, ... }, ... }
 * @returns {Array<Object>} Array of { id, text, numQuestions,
 *   lowCount, midCount, highCount }
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

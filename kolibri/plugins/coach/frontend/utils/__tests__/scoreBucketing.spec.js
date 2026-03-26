import { ScoreBucket } from '../../constants/courseConstants';
import {
  classifyLearnerMastery,
  bucketScoresForObjective,
  bucketAllObjectives,
} from '../scoreBucketing';

describe('classifyLearnerMastery', () => {
  // --- LOW bucket: ratio <= 0.5 ---

  it('returns LOW for 0 correct out of 10', () => {
    expect(classifyLearnerMastery(0, 10)).toBe(ScoreBucket.LOW);
  });

  it('returns LOW for 3/10 (30%)', () => {
    expect(classifyLearnerMastery(3, 10)).toBe(ScoreBucket.LOW);
  });

  it('returns LOW for exactly 50% (boundary — 5/10)', () => {
    expect(classifyLearnerMastery(5, 10)).toBe(ScoreBucket.LOW);
  });

  it('returns LOW when numQuestions is 0', () => {
    expect(classifyLearnerMastery(0, 0)).toBe(ScoreBucket.LOW);
  });

  it('returns LOW when numQuestions is 0 even with a positive correctCount', () => {
    expect(classifyLearnerMastery(5, 0)).toBe(ScoreBucket.LOW);
  });

  // --- MID bucket: ratio > 0.5 and <= 0.8 ---

  it('returns MID for 51% (boundary — just above low)', () => {
    // 51/100 = 0.51
    expect(classifyLearnerMastery(51, 100)).toBe(ScoreBucket.MID);
  });

  it('returns MID for 6/10 (60%)', () => {
    expect(classifyLearnerMastery(6, 10)).toBe(ScoreBucket.MID);
  });

  it('returns MID for exactly 80% (boundary — 8/10)', () => {
    expect(classifyLearnerMastery(8, 10)).toBe(ScoreBucket.MID);
  });

  it('returns MID for 4/5 (80%)', () => {
    expect(classifyLearnerMastery(4, 5)).toBe(ScoreBucket.MID);
  });

  // --- HIGH bucket: ratio > 0.8 ---

  it('returns HIGH for 81% (boundary — just above mid)', () => {
    // 81/100 = 0.81
    expect(classifyLearnerMastery(81, 100)).toBe(ScoreBucket.HIGH);
  });

  it('returns HIGH for 9/10 (90%)', () => {
    expect(classifyLearnerMastery(9, 10)).toBe(ScoreBucket.HIGH);
  });

  it('returns HIGH for 10/10 (100%)', () => {
    expect(classifyLearnerMastery(10, 10)).toBe(ScoreBucket.HIGH);
  });

  it('returns HIGH for 5/5 (100%)', () => {
    expect(classifyLearnerMastery(5, 5)).toBe(ScoreBucket.HIGH);
  });

  // --- Edge cases with small question counts ---

  it('handles 1 question: 0/1 is LOW', () => {
    expect(classifyLearnerMastery(0, 1)).toBe(ScoreBucket.LOW);
  });

  it('handles 1 question: 1/1 is HIGH', () => {
    expect(classifyLearnerMastery(1, 1)).toBe(ScoreBucket.HIGH);
  });

  it('handles 2 questions: 1/2 (50%) is LOW', () => {
    expect(classifyLearnerMastery(1, 2)).toBe(ScoreBucket.LOW);
  });

  it('handles 3 questions: 2/3 (66.7%) is MID', () => {
    expect(classifyLearnerMastery(2, 3)).toBe(ScoreBucket.MID);
  });

  it('handles 3 questions: 3/3 (100%) is HIGH', () => {
    expect(classifyLearnerMastery(3, 3)).toBe(ScoreBucket.HIGH);
  });
});

describe('bucketScoresForObjective', () => {
  it('buckets learner scores into low/mid/high using 50%/80% thresholds', () => {
    // 10 questions total
    // learnerA: 3/10 = 30% → low
    // learnerB: 6/10 = 60% → mid
    // learnerC: 9/10 = 90% → high
    const scores = {
      learnerA: { lo1: 3 },
      learnerB: { lo1: 6 },
      learnerC: { lo1: 9 },
    };
    const result = bucketScoresForObjective(scores, 'lo1', 10);
    expect(result).toEqual({ lowCount: 1, midCount: 1, highCount: 1 });
  });

  it('treats exactly 50% as low (boundary)', () => {
    // 10 questions, score 5 → 5/10 = 0.5 → low (<=0.5)
    const scores = {
      learnerA: { lo1: 5 },
    };
    const result = bucketScoresForObjective(scores, 'lo1', 10);
    expect(result).toEqual({ lowCount: 1, midCount: 0, highCount: 0 });
  });

  it('treats exactly 80% as mid (boundary)', () => {
    // 10 questions, score 8 → 8/10 = 0.8 → mid (<=0.8)
    const scores = {
      learnerA: { lo1: 8 },
    };
    const result = bucketScoresForObjective(scores, 'lo1', 10);
    expect(result).toEqual({ lowCount: 0, midCount: 1, highCount: 0 });
  });

  it('treats >80% as high', () => {
    // 10 questions, score 9 → 9/10 = 0.9 → high (>0.8)
    const scores = {
      learnerA: { lo1: 9 },
    };
    const result = bucketScoresForObjective(scores, 'lo1', 10);
    expect(result).toEqual({ lowCount: 0, midCount: 0, highCount: 1 });
  });

  it('counts a learner who took the test but has no score for this LO as low', () => {
    // learnerA is in scores but has no entry for 'lo2'
    const scores = {
      learnerA: { lo1: 9 },
    };
    const result = bucketScoresForObjective(scores, 'lo2', 10);
    expect(result).toEqual({ lowCount: 1, midCount: 0, highCount: 0 });
  });

  it('excludes learners not present in scores', () => {
    // Only learnerA is in scores; learnerB is not
    const scores = {
      learnerA: { lo1: 9 },
    };
    const result = bucketScoresForObjective(scores, 'lo1', 10);
    // Only 1 learner counted, not 2
    expect(result).toEqual({ lowCount: 0, midCount: 0, highCount: 1 });
    expect(result.lowCount + result.midCount + result.highCount).toBe(1);
  });

  it('handles numQuestions of 0', () => {
    // When numQuestions is 0, ratio is 0, so all present learners are low
    const scores = {
      learnerA: { lo1: 0 },
      learnerB: { lo1: 5 },
    };
    const result = bucketScoresForObjective(scores, 'lo1', 0);
    expect(result).toEqual({ lowCount: 2, midCount: 0, highCount: 0 });
  });
});

describe('bucketAllObjectives', () => {
  it('returns bucketed counts for each LO', () => {
    const learningObjectives = [
      { id: 'lo1', text: 'Objective 1', num_questions: 10 },
      { id: 'lo2', text: 'Objective 2', num_questions: 5 },
    ];
    const scores = {
      learnerA: { lo1: 9, lo2: 1 },
      learnerB: { lo1: 3, lo2: 5 },
    };
    const result = bucketAllObjectives(learningObjectives, scores);
    expect(result).toEqual([
      {
        id: 'lo1',
        text: 'Objective 1',
        numQuestions: 10,
        lowCount: 1, // learnerB: 3/10=30%
        midCount: 0,
        highCount: 1, // learnerA: 9/10=90%
      },
      {
        id: 'lo2',
        text: 'Objective 2',
        numQuestions: 5,
        lowCount: 1, // learnerA: 1/5=20%
        midCount: 0,
        highCount: 1, // learnerB: 5/5=100%
      },
    ]);
  });

  it('returns empty array when no objectives', () => {
    const result = bucketAllObjectives([], {});
    expect(result).toEqual([]);
  });
});

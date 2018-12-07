import { ExamResource } from 'kolibri.resources';

export function _createExam(store, exam) {
  return ExamResource.saveModel({ data: exam });
}

export function _examState(exam) {
  return {
    id: exam.id,
    title: exam.title,
    channelId: exam.channel_id,
    collection: exam.collection,
    active: exam.active,
    archive: exam.archive,
    questionCount: exam.question_count,
    questionSources: exam.question_sources,
    seed: exam.seed,
    assignments: exam.assignments,
  };
}

export function _examsState(exams) {
  return exams.map(exam => _examState(exam));
}

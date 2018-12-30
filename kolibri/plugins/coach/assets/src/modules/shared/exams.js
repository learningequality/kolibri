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
    assignments: exam.assignments,
    learnersSeeFixedOrder: exam.learners_see_fixed_order,
    dataModelVersion: exam.data_model_version,
    v0_seed: exam.v0_seed,
  };
}

export function _examsState(exams) {
  return exams.map(exam => _examState(exam));
}

import { ExamResource } from 'kolibri.resources';

export function createExam(store, exam) {
  return ExamResource.saveModel({ data: exam });
}

export function examState(exam) {
  return {
    id: exam.id,
    title: exam.title,
    collection: exam.collection,
    active: exam.active,
    archive: exam.archive,
    questionCount: exam.question_count,
    questionSources: exam.question_sources,
    assignments: exam.assignments,
    learnersSeeFixedOrder: exam.learners_see_fixed_order,
    dataModelVersion: exam.data_model_version,
    seed: exam.seed,
  };
}

export function examsState(exams) {
  return exams.map(exam => examState(exam));
}

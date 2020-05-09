import { createExam } from '../examShared/exams';

export function copyExam(store, { exam }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  return new Promise((resolve, reject) => {
    createExam(store, exam).then(newExam => {
      store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
      store.commit('examsRoot/ADD_EXAM', newExam, { root: true });
      resolve(newExam);
    }, reject);
  });
}

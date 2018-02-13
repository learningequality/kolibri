import { ClassesPageNames } from '../../constants';

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  store.dispatch('SET_PAGE_NAME', ClassesPageNames.ALL_CLASSES);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

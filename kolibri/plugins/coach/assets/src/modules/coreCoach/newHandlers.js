import { PageNames } from '../../constants';

export function showClassListPage(store) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.CLASS_LIST);
  return store.dispatch('setClassState').then(
    () => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => store.dispatch('handleApiError', error)
  );
}

export function showHomePage(store, classId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.HOME_PAGE);
  return store.dispatch('classSummary/loadClassSummary', classId).then(
    () => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => store.dispatch('handleApiError', error)
  );
}

/* COACH - under construction ... */
export function showNewPage(store) {
  store.commit('SET_PAGE_NAME', PageNames.NEW_COACH_PAGES);
  store.commit('CORE_SET_PAGE_LOADING', false);
  store.commit('SET_CLASS_INFO', {
    classId: '1',
    currentClassroom: null,
    classList: [],
  });
}
/* ... COACH - under construction */

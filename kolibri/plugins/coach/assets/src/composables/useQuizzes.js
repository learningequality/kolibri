import sortBy from 'lodash/sortBy';
import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';

export default function useQuizzes(store) {
  store = store || getCurrentInstance().proxy.$store;
  const quizzes = computed(() => sortBy(store.getters['classSummary/exams'], 'date-created'));
  const fetchQuizSizes = () => store.dispatch('classSummary/fetchQuizzesSizes');

  return {
    quizzes,
    fetchQuizSizes,
  };
}

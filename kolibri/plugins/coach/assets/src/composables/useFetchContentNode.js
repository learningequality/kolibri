import { ref, getCurrentInstance, computed } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { exerciseToQuestionArray } from '../utils/selectQuestions';

export default function useFetchContentNode(contentId) {
  const contentNode = ref(null);
  const ancestors = ref([]);
  const questions = ref([]);
  const loading = ref(true);
  const store = getCurrentInstance().proxy.$store;

  const fetchContentNode = async () => {
    if (!contentId) {
      return;
    }
    ContentNodeResource.fetchModel({
      id: contentId,
      getParams: { no_available_filtering: true },
    })
      .then(node => {
        loading.value = false;
        contentNode.value = node;

        if (node.ancestors.length) {
          ancestors.value = node.ancestors;
        }

        if (node.assessmentmetadata) {
          questions.value = node.assessmentmetadata.assessment_item_ids;
        }
      })
      .catch(error => {
        store.dispatch('handleApiError', { error });
      });
  };

  const exerciseQuestions = computed(() => exerciseToQuestionArray(contentNode.value));

  fetchContentNode();

  return {
    loading,
    ancestors,
    contentNode,
    questions,
    exerciseQuestions,
  };
}

import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { PageNames } from '../../constants';

const { getFacilities, facilities } = useFacilities();

export async function showLessonResourceContentPreview(store, params) {
  const { classId, lessonId, contentId } = params;
  const initClassInfoPromise = store.dispatch('initClassInfo', classId);
  const { isSuperuser } = useUser();
  const getFacilitiesPromise =
    get(isSuperuser) && get(facilities).length === 0
      ? getFacilities().catch(() => {})
      : Promise.resolve();

  await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
  return store.dispatch('loading').then(() => {
    return _prepLessonContentPreview(store, classId, lessonId, contentId).then(() => {
      store.dispatch('notLoading');
    });
  });
}

function _prepLessonContentPreview(store, classId, lessonId, contentId) {
  const cache = store.state.lessonSummary.resourceCache || {};
  return ContentNodeResource.fetchModel({
    id: contentId,
    getParams: { no_available_filtering: true },
  }).then(
    contentNode => {
      store.commit('lessonSummary/SET_STATE', {
        toolbarRoute: {},
        // only exist if exercises
        workingResources: null,
        resourceCache: cache,
      });

      store.commit('lessonSummary/resources/SET_CURRENT_CONTENT_NODE', contentNode);

      if (contentNode.assessmentmetadata) {
        store.commit('lessonSummary/resources/SET_PREVIEW_STATE', {
          questions: contentNode.assessmentmetadata.assessment_item_ids,
          completionData: contentNode.assessmentmetadata.mastery_model,
        });
      }

      store.commit('SET_PAGE_NAME', PageNames.LESSON_CONTENT_PREVIEW);
      return contentNode;
    },
    error => {
      return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
    },
  );
}

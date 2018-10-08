import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentNodeSearchResource,
  ChannelResource,
} from 'kolibri.resources';
import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
import pickBy from 'lodash/pickBy';
import { PageNames } from '../../constants';

function showExamCreationPage(store, params) {
  const { classId, contentList, pageName, ancestors = [], searchResults = null } = params;

  return store.dispatch('loading').then(() => {
    return store.dispatch('setClassState', classId).then(
      () => {
        store.commit('examCreation/SET_ANCESTORS', ancestors);

        const ancestorCounts = {};
        let getResourceAncestors;
        // Don't get ancestors if at the Channels page
        if (pageName === PageNames.EXAM_CREATION_ROOT) {
          getResourceAncestors = [];
        } else {
          getResourceAncestors = store.state.examCreation.selectedExercises.map(({ id }) =>
            ContentNodeSlimResource.fetchAncestors(id)
          );
        }

        return Promise.all(getResourceAncestors).then(
          // there has to be a better way
          resourceAncestors => {
            resourceAncestors.forEach(ancestorArray =>
              ancestorArray.forEach(ancestor => {
                if (ancestorCounts[ancestor.id]) {
                  ancestorCounts[ancestor.id]++;
                } else {
                  ancestorCounts[ancestor.id] = 1;
                }
              })
            );
            store.commit('examCreation/SET_ANCESTOR_COUNTS', ancestorCounts);
            store.commit('examCreation/SET_CONTENT_LIST', contentList);
            if (searchResults) {
              store.commit('examCreation/SET_SEARCH_RESULTS', searchResults);
            }
            store.commit('SET_PAGE_NAME', pageName);
            store.commit('SET_TOOLBAR_ROUTE', {
              name: PageNames.EXAMS,
            });
            store.dispatch('notLoading');
          }
        );
      },
      error => {
        store.dispatch('notLoading');
        return store.dispatch('handleApiError', error);
      }
    );
  });
}

export function showExamCreationRootPage(store, params) {
  return store.dispatch('loading').then(() => {
    ChannelResource.fetchCollection({
      getParams: { available: true, has_exercise: true },
    }).then(channels => {
      const channelContentList = channels.map(channel => ({
        ...channel,
        title: channel.name,
        kind: ContentNodeKinds.CHANNEL,
      }));
      return showExamCreationPage(store, {
        classId: params.classId,
        contentList: channelContentList,
        pageName: PageNames.EXAM_CREATION_ROOT,
      });
    });
  });
}

export function showExamCreationTopicPage(store, params) {
  // IDEA should probably have both selection pages set loading themselves
  return store.dispatch('loading').then(() => {
    const { topicId } = params;
    const topicNodePromise = ContentNodeResource.fetchModel({ id: topicId });
    const childTopicsPromise = ContentNodeResource.fetchCollection({
      getParams: { parent: topicId, kind: ContentNodeKinds.TOPIC },
    });
    const childExercisesPromise = ContentNodeResource.fetchCollection({
      getParams: { parent: topicId, kind: ContentNodeKinds.EXERCISE },
    });
    const ancestorsPromise = ContentNodeSlimResource.fetchAncestors(topicId);
    const loadRequirements = [
      topicNodePromise,
      childTopicsPromise,
      childExercisesPromise,
      ancestorsPromise,
    ];

    return Promise.all(loadRequirements).then(
      ([topicNode, childTopics, childExercises, ancestors]) => {
        const topicIds = childTopics.map(topic => topic.id);
        const topicsThatHaveExerciseDescendants = getTopicsWithExerciseDescendants(topicIds);
        topicsThatHaveExerciseDescendants.then(topics => {
          const updatedChildTopics = topics.map(topicExerciseDetails => {
            const topicNode = childTopics.find(
              topicNode => topicNode.id === topicExerciseDetails.id
            );
            return {
              ...topicExerciseDetails,
              ...topicNode,
            };
          });

          const childNodes = [...updatedChildTopics, ...childExercises];
          const topicContentList = childNodes.map(node => {
            return { ...node, thumbnail: getContentNodeThumbnail(node) };
          });

          return showExamCreationPage(store, {
            classId: params.classId,
            contentList: topicContentList,
            pageName: PageNames.EXAM_CREATION_TOPIC,
            ancestors: [...ancestors, topicNode],
          });
        });
      }
    );
  });
}

// TODO
export function showExamCreationPreviewPage() {}

export function showExamCreationSearchPage(store, params, query = {}) {
  return store.dispatch('loading').then(() => {
    // TODO: Also include topics
    return ContentNodeSearchResource.fetchCollection({
      getParams: {
        search: params.searchTerm,
        kind: ContentNodeKinds.EXERCISE,
        ...pickBy({ channel_id: query.channel }),
      },
    }).then(results => {
      return showExamCreationPage(store, {
        classId: params.classId,
        contentList: results.results,
        pageName: PageNames.EXAM_CREATION_SEARCH,
        searchResults: results,
      });
    });
  });
}

function getTopicsWithExerciseDescendants(topicIds = []) {
  return new Promise(resolve => {
    const topicsNumAssessmentDescendantsPromises = topicIds.map(topicId =>
      ContentNodeResource.fetchDescendantsAssessments(topicId)
    );

    Promise.all(topicsNumAssessmentDescendantsPromises).then(topicsNumAssessmentDescendants => {
      const topicsWithExerciseDescendants = [];
      topicsNumAssessmentDescendants.forEach((numAssessments, index) => {
        if (numAssessments > 0) {
          topicsWithExerciseDescendants.push({
            id: topicIds[index],
            numAssessments,
          });
        }
      });

      const topicExercisesPromises = topicsWithExerciseDescendants.map(topic =>
        ContentNodeResource.fetchDescendantsCollection(topic.id, {
          descendant_kind: ContentNodeKinds.EXERCISE,
          fields: ['id', 'title', 'content_id'],
        })
      );
      Promise.all(topicExercisesPromises).then(exercises => {
        exercises.forEach((exercise, index) => {
          topicsWithExerciseDescendants[index].exercises = exercise;
        });
        resolve(topicsWithExerciseDescendants);
      });
    });
  });
}

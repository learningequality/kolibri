<template>

  <div>
    <div class="channels-header">
      <span class="side-panel-subtitle">
        {{ selectFromChannels$() }}
      </span>
      <KButton
        icon="filter"
        :text="searchLabel$()"
      />
    </div>

    <div class="topic-info">
      <h2>
        <KIcon
          icon="topic"
          class="mr-8"
        />
        <span>
          {{ topic.title }}
        </span>
      </h2>
      <p :style="{ color: $themeTokens.annotation }">
        {{ topic.description }}
      </p>
    </div>

    <UpdatedResourceSelection
      canSelectAll
      :topic="topic"
      :contentList="contentList"
      :hasMore="hasMore"
      :fetchMore="fetchMore"
      :loadingMore="loadingMore"
      :selectionRules="selectionRules"
      :selectedResources="selectedResources"
      @selectResources="$emit('selectResources', $event)"
      @deselectResources="$emit('deselectResources', $event)"
    />
  </div>

</template>


<script>

  import { getCurrentInstance } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';
  import { coachStrings } from '../../../../../common/commonCoachStrings';
  import { PageNames } from '../../../../../../constants';

  /**
   * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectFromChannels',
    components: {
      UpdatedResourceSelection,
    },
    setup(props) {
      const { selectFromChannels$, searchLabel$ } = coreStrings;
      const { manageLessonResourcesTitle$ } = coachStrings;
      const instance = getCurrentInstance();

      props.setTitle(manageLessonResourcesTitle$());
      props.setGoBack(() => {
        instance.proxy.$router.push({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        });
      });

      const { data, hasMore, fetchMore, loadingMore } = props.treeFetch;
      return {
        contentList: data,
        hasMore,
        fetchMore,
        loadingMore,
        searchLabel$,
        selectFromChannels$,
      };
    },
    props: {
      setTitle: {
        type: Function,
        default: () => {},
      },
      setGoBack: {
        type: Function,
        default: () => {},
      },
      topic: {
        type: Object,
        required: true,
      },
      /**
       * Fetch object for fetching resource tree.
       * @type {FetchObject}
       */
      treeFetch: {
        type: Object,
        required: true,
      },
      selectionRules: {
        type: Array,
        required: false,
        default: () => [],
      },
      selectedResources: {
        type: Array,
        required: true,
      },
    },
    beforeRouteEnter(to, _, next) {
      const { topicId } = to.query;
      if (!topicId) {
        return next({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
          params: {
            ...to.params,
          },
        });
      }
      return next();
    },
  };

</script>


<style scoped>

  .side-panel-subtitle {
    font-size: 16px;
    font-weight: 600;
  }

  .channels-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .mr-8 {
    margin-right: 8px;
  }

</style>

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
      :source="ResourceContentSource.TOPIC_TREE"
    />
  </div>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { ResourceContentSource } from '../constants';
  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';
  import { injectResourceSelection } from '../useResourceSelection';
  import { coachStrings } from '../../../../../common/commonCoachStrings';
  import { PageNames } from '../../../../../../constants';

  export default {
    name: 'SelectFromChannels',
    components: {
      UpdatedResourceSelection,
    },
    setup(props, { root }) {
      const { selectFromChannels$, searchLabel$ } = coreStrings;
      const { manageLessonResourcesTitle$ } = coachStrings;
      const { topic } = injectResourceSelection();

      props.setTitle(manageLessonResourcesTitle$());
      props.setGoBack(() => {
        root.$router.push({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        });
      });

      return {
        topic,
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
    },
    data() {
      return {
        ResourceContentSource,
      };
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

<template>

  <div>
    <KCircularLoader v-if="loading && !contentNode" />
    <div v-else-if="contentNode">
      <h2 class="resource-title">
        <KLabeledIcon>
          <template #icon>
            <LearningActivityIcon :kind="contentNode.learning_activities || []" />
          </template>
          <template>
            {{ contentNode.title }}
          </template>
        </KLabeledIcon>
      </h2>

      <KBreadcrumbs
        v-if="breadcrumbItems.length"
        :items="breadcrumbItems"
      />

      <QuestionsAccordion
        v-if="isExercise"
        :questions="exerciseQuestions"
        :getQuestionContent="getQuestionContent"
        :isSelectable="false"
      />
      <PreviewContent
        v-else
        :currentContentNode="contentNode"
        :ancestors="ancestors"
        :questions="questions"
        :isExercise="false"
      />

      <PreviewMetadata :contentNode="contentNode" />
    </div>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { ContentNodeKinds } from 'kolibri/constants';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import useFetchContentNode from '../../../../../composables/useFetchContentNode';
  import PreviewContent from '../../../../common/resourceSelection/subPages/PreviewSelectedResources/PreviewContent';
  import PreviewMetadata from '../../../../common/resourceSelection/subPages/PreviewSelectedResources/PreviewMetadata';
  import QuestionsAccordion from '../../../../common/QuestionsAccordion';

  export default {
    name: 'CourseResourcePreview',
    components: {
      LearningActivityIcon,
      PreviewContent,
      PreviewMetadata,
      QuestionsAccordion,
    },
    setup(props) {
      const { contentNode, ancestors, questions, loading, exerciseQuestions } = useFetchContentNode(
        props.contentId,
      );

      const isExercise = computed(() => contentNode.value?.kind === ContentNodeKinds.EXERCISE);

      function getQuestionContent() {
        return contentNode.value;
      }

      return {
        contentNode,
        ancestors,
        questions,
        loading,
        exerciseQuestions,
        isExercise,
        getQuestionContent,
      };
    },
    props: {
      contentId: {
        type: String,
        required: true,
      },
      breadcrumbItems: {
        type: Array,
        default: () => [],
      },
    },
  };

</script>


<style lang="scss" scoped>

  .resource-title {
    margin: 16px 0 24px;
  }

</style>

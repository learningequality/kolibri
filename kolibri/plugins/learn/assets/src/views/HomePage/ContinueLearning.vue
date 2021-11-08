<template>

  <section>
    <h2>
      <KLabeledIcon
        icon="forward"
        :label="header"
      />
    </h2>

    <CardGrid :gridType="1">
      <template v-if="fromClasses">
        <ResourceCard
          v-for="(resource, idx) in uniqueResumableClassesResources"
          :key="`resource-${idx}`"
          :contentNode="getResumableContentNode(resource.contentNodeId)"
          :to="getClassResourceLink(resource)"
          :collectionTitle="getResourceClassName(resource)"
        />
        <QuizCard
          v-for="(quiz, idx) in resumableClassesQuizzes"
          :key="`quiz-${idx}`"
          :quiz="quiz"
          :to="getClassQuizLink(quiz)"
          :collectionTitle="getQuizClassName(quiz)"
          showThumbnail
        />
      </template>
      <template v-else>
        <ResourceCard
          v-for="(contentNode, idx) in resumableNonClassesContentNodes"
          :key="idx"
          :contentNode="contentNode"
          :to="getTopicContentNodeLink(contentNode.id)"
          :collectionTitle="getContentNodeTopicName(contentNode)"
        />
      </template>
    </CardGrid>
  </section>

</template>


<script>

  import last from 'lodash/last';
  import uniqBy from 'lodash/uniqBy';
  import { computed } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import CardGrid from '../cards/CardGrid';
  import QuizCard from '../cards/QuizCard';
  import ResourceCard from '../cards/ResourceCard';
  import useLearnerResources from '../../composables/useLearnerResources';

  /**
   * Shows learner's resources and quizzes that are in progress.
   */
  export default {
    name: 'ContinueLearning',
    components: {
      CardGrid,
      ResourceCard,
      QuizCard,
    },
    setup() {
      const {
        resumableClassesQuizzes,
        resumableClassesResources,
        resumableNonClassesContentNodes,
        getClass,
        getResumableContentNode,
        getClassQuizLink,
        getClassResourceLink,
        getTopicContentNodeLink,
      } = useLearnerResources();

      // A single resource can be in more lessons and in more classes
      // and progress information is shared between all classes and lessons
      // where it belongs to.
      // In such case we want to display it only once for its first occurence.
      const uniqueResumableClassesResources = computed(() => {
        return uniqBy(get(resumableClassesResources), 'contentNodeId');
      });

      function getResourceClassName(resource) {
        const resourceClass = getClass(resource.classId);
        return resourceClass ? resourceClass.name : '';
      }

      function getQuizClassName(quiz) {
        const quizClass = getClass(quiz.collection);
        return quizClass ? quizClass.name : '';
      }

      function getContentNodeTopicName(contentNode) {
        if (!contentNode || !contentNode.ancestors || !contentNode.ancestors.length > 0) {
          return '';
        }
        return last(contentNode.ancestors).title;
      }

      return {
        resumableClassesQuizzes,
        resumableNonClassesContentNodes,
        uniqueResumableClassesResources,
        getResumableContentNode,
        getClassQuizLink,
        getClassResourceLink,
        getTopicContentNodeLink,
        getQuizClassName,
        getResourceClassName,
        getContentNodeTopicName,
      };
    },
    props: {
      /**
       * If `true`, classes resources and quizess will be displayed.
       * Otherwise resources outside of classes will be displayed.
       * The section header will also differ.
       */
      fromClasses: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      header() {
        return this.fromClasses
          ? this.$tr('continueLearningFromClassesHeader')
          : this.$tr('continueLearningOnYourOwnHeader');
      },
    },
    $trs: {
      continueLearningOnYourOwnHeader: {
        message: 'Continue learning on your own',
        context:
          'Option to continue interacting with the resources (lessons, quizzes) in a self-directed way or through free exploration, rather than via material that coaches have prepared and made available in classes.',
      },
      continueLearningFromClassesHeader: {
        message: 'Continue learning from your classes',
        context:
          'Option to continue interacting with the resources (lessons, quizzes) coaches have prepared and made available in the classes learner is enrolled into.',
      },
    },
  };

</script>

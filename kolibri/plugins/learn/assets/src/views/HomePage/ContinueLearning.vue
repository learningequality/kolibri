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
          v-for="(resource, idx) in resumableClassesResources"
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
          :collectionName="getContentNodeTopicName(contentNode)"
        />
      </template>
    </CardGrid>
  </section>

</template>


<script>

  import last from 'lodash/last';
  import CardGrid from '../cards/CardGrid';
  import QuizCard from '../cards/QuizCard';
  import ResourceCard from '../cards/ResourceCard';
  import useLearnerResources from './useLearnerResources';

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
        resumableClassesResources,
        resumableNonClassesContentNodes,
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
      continueLearningOnYourOwnHeader: 'Continue learning on your own',
      continueLearningFromClassesHeader: 'Continue learning from your classes',
    },
  };

</script>

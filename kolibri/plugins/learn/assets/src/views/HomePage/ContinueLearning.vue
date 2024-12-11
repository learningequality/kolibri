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
          :contentNode="resource.contentNode"
          :to="genContentLinkBackLinkCurrentPage(resource.contentNode.id, true)"
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
          v-for="(contentNode, idx) in resumableContentNodes"
          :key="idx"
          :contentNode="contentNode"
          :to="genContentLinkBackLinkCurrentPage(contentNode.id, true)"
          :collectionTitle="getContentNodeTopicName(contentNode)"
          @openCopiesModal="openCopiesModal"
        />
      </template>
    </CardGrid>
    <KButton
      v-if="moreResumableContentNodes"
      style="margin-top: 16px"
      appearance="basic-link"
      @click="fetchMoreResumableContentNodes"
    >
      {{ coreString('viewMoreAction') }}
    </KButton>
    <CopiesModal
      v-if="displayedCopies.length"
      :copies="displayedCopies"
      @closeModal="displayedCopies = []"
    />
  </section>

</template>


<script>

  import last from 'lodash/last';
  import uniqBy from 'lodash/uniqBy';
  import { computed } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { get } from '@vueuse/core';
  import CardGrid from '../cards/CardGrid';
  import QuizCard from '../cards/QuizCard';
  import ResourceCard from '../cards/ResourceCard';
  import CopiesModal from '../CopiesModal';
  import useLearnerResources from '../../composables/useLearnerResources';
  import useContentLink from '../../composables/useContentLink';

  /**
   * Shows learner's resources and quizzes that are in progress.
   */
  export default {
    name: 'ContinueLearning',
    components: {
      CardGrid,
      ResourceCard,
      QuizCard,
      CopiesModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const {
        resumableClassesQuizzes,
        resumableClassesResources,
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
        getClass,
        getClassQuizLink,
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

      const { genContentLinkBackLinkCurrentPage } = useContentLink();

      return {
        resumableClassesQuizzes,
        resumableContentNodes,
        moreResumableContentNodes,
        fetchMoreResumableContentNodes,
        uniqueResumableClassesResources,
        getClassQuizLink,
        getQuizClassName,
        getResourceClassName,
        getContentNodeTopicName,
        genContentLinkBackLinkCurrentPage,
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
    data() {
      return {
        displayedCopies: [],
      };
    },
    computed: {
      header() {
        return this.fromClasses
          ? this.$tr('continueLearningFromClassesHeader')
          : this.$tr('continueLearningOnYourOwnHeader');
      },
    },
    methods: {
      openCopiesModal(copies) {
        this.displayedCopies = copies;
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

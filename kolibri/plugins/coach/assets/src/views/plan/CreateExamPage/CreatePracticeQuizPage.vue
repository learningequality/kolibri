<template>

  <CoachImmersivePage
    :appBarTitle="$tr('createNewExamLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="$tr('selectPracticeQuizLabel')"
    :route="toolbarRoute"
    :primary="false"
  >
    <KPageContainer>

      <h1>{{ $tr('selectPracticeQuizLabel') }}</h1>
      <div v-if="ancestors.length === 0">
        {{ $tr('channelsWithQuizzesLabel') }}
      </div>

      <ResourceSelectionBreadcrumbs
        :ancestors="ancestors"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <ContentCardList
        :contentList="filteredContentList"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        :viewMoreButtonState="viewMoreButtonState"
        :contentIsChecked="contentIsSelected"
        :contentHasCheckbox="contentHasCheckbox"
      />

    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import { PageNames } from '../../../constants';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';

  export default {
    name: 'CreatePracticeQuizPage',
    components: {
      CoachImmersivePage,
      ContentCardList,
      ResourceSelectionBreadcrumbs,
    },
    mixins: [commonCoreStrings, commonCoach, responsiveWindowMixin],
    data() {
      return {
        viewMoreButtonState: 'no_more_results',
        contentHasCheckbox: () => false,
        contentIsSelected: () => '',
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', ['contentList', 'selectedExercises', 'ancestors']),
      filteredContentList() {
        return this.contentList;
      },
      channelsLink() {
        return {
          name: PageNames.EXAM_CREATION_PRACTICE_QUIZ,
          params: {
            classId: this.classId,
          },
        };
      },
    },
    methods: {
      contentLink(content) {
        if (!content.is_leaf) {
          return {
            name: PageNames.EXAM_CREATION_SELECT_PRACTICE_QUIZ_TOPIC,
            params: {
              classId: this.classId,
              topicId: content.id,
            },
          };
        }

        const value = content.assessmentmetadata.assessment_item_ids.length;
        this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);

        return {
          name: PageNames.EXAM_CREATION_PRACTICE_QUIZ_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
        };
      },
      topicsLink(topicId) {
        return {
          name: PageNames.EXAM_CREATION_SELECT_PRACTICE_QUIZ_TOPIC,
          params: {
            classId: this.classId,
            topicId,
          },
        };
      },
      selectionMetadata(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          const count = content.exercises.filter(exercise =>
            Boolean(this.selectedExercises[exercise.id])
          ).length;
          if (count === 0) {
            return '';
          }
          const total = content.exercises.length;
          return this.$tr('selectionInformation', { count, total });
        }
        return '';
      },
    },
    $trs: {
      createNewExamLabel: {
        message: 'Create new quiz',
        context: "Title of the screen launched from the 'New quiz' button on the 'Plan' tab.\n",
      },
      selectPracticeQuizLabel: {
        message: 'Select a practice quiz',
        context:
          "Practice quizzes are pre-made quizzes, that don't require the curation work on the part of the coach. Selecting a practice quiz refers to importing a ready-to-use quiz.",
      },
      channelsWithQuizzesLabel: {
        message: 'The following channels contain pre-made quizzes',
        context:
          "Pre-made quizzes are also known as practice quizzes. They are ones that don't require the curation work on the part of the coach.",
      },
      selectionInformation: {
        message:
          '{count, number, integer} of {total, number, integer} {total, plural, one {resource selected} other {resources selected}}',
        context:
          'Refers to a number of resources selected out of a total number. For example:\n\n"4 of 10 resources selected"',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    display: inline-block;
    vertical-align: middle;
  }

</style>

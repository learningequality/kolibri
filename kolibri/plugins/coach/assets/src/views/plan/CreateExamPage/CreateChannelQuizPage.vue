<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="true"
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="$tr('createNewExamLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :pageTitle="$tr('selectChannelQuizLabel')"
    :marginBottom="72"
  >
    <KPageContainer>

      <h1>{{ $tr('selectChannelQuizLabel') }}</h1>

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

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import { PageNames } from '../../../constants/';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import commonCoach from '../../common';

  export default {
    name: 'CreateChannelQuizPage',
    components: {
      ResourceSelectionBreadcrumbs,
      ContentCardList,
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
          name: PageNames.EXAM_CREATION_CHANNEL_QUIZ,
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
            name: PageNames.EXAM_CREATION_SELECT_CHANNEL_QUIZ_TOPIC,
            params: {
              classId: this.classId,
              topicId: content.id,
            },
          };
        }

        let value = content.assessmentmetadata.assessment_item_ids.length;
        this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);

        return {
          name: PageNames.EXAM_CREATION_CHANNEL_QUIZ_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
        };
      },
      topicsLink(topicId) {
        return {
          name: PageNames.EXAM_CREATION_SELECT_CHANNEL_QUIZ_TOPIC,
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
      createNewExamLabel: 'Create new quiz',
      selectChannelQuizLabel: 'Select a channel quiz',
      selectionInformation:
        '{count, number, integer} of {total, number, integer} {total, plural, one {resource selected} other {resources selected}}',
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    display: inline-block;
    vertical-align: middle;
  }

</style>

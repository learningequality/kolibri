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

      <BottomAppBar>
        <KButtonGroup>
          <KRouterLink
            appearance="flat-button"
            :text="coreString('cancelAction')"
            :to="toolbarRoute"
          />
          <KButton
            :text="coreString('finishAction')"
            primary
            @click="finishProcess"
          />
        </KButtonGroup>
      </BottomAppBar>
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import pickBy from 'lodash/pickBy';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import { PageNames } from '../../../constants/';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import commonCoach from '../../common';

  export default {
    name: 'CreateChannelQuizPage',
    components: {
      BottomAppBar,
      ResourceSelectionBreadcrumbs,
      ContentCardList,
    },
    mixins: [commonCoreStrings, commonCoach, responsiveWindowMixin],
    data() {
      return {
        // showError: false,
        // filters: {
        //   channel: this.$route.query.channel || null,
        //   kind: this.$route.query.kind || null,
        //   role: this.$route.query.role || null,
        // },
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', ['contentList', 'selectedExercises', 'ancestors']),
      pageName() {
        return this.$route.name;
      },
      filteredContentList() {
        console.log(this);
        return this.contentList;
      },
      viewMoreButtonState() {
        console.log('here');
        return 'visible';
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
        const { query } = this.$route;
        console.log('query in contentlink', query);
        return {
          name: PageNames.EXAM_CREATION_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
          query: {
            ...query,
            ...pickBy({
              searchTerm: this.$route.params.searchTerm,
            }),
          },
        };
      },
      topicsLink(topicId) {
        console.log(this, topicId);
        return {
          name: PageNames.EXAM_CREATION_SELECT_CHANNEL_QUIZ_TOPIC,
          params: {
            classId: this.classId,
            topicId,
          },
        };
      },
      contentHasCheckbox() {
        if (this.pageName === 'EXAM_CREATION_CHANNEL_QUIZ') {
          return this.pageName !== PageNames.EXAM_CREATION_CHANNEL_QUIZ;
        } else if (this.pageName === 'EXAM_CREATION_SELECT_CHANNEL_QUIZ_TOPIC') {
          return this.pageName !== PageNames.EXAM_CREATION_SELECT_CHANNEL_QUIZ_TOPIC;
        }
      },
      contentIsSelected(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          return content.exercises.every(exercise => Boolean(this.selectedExercises[exercise.id]));
        } else {
          return Boolean(this.selectedExercises[content.id]);
        }
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
      finishProcess() {
        console.log('here');
        return;
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

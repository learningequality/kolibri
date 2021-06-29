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
      <ContentCardList
        :contentList="filteredContentList"
        :viewMoreButtonState="viewMoreButtonState"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        @moreresults="handleMoreResults"
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import commonCoach from '../../common';

  export default {
    name: 'CreateChannelQuizPage',
    components: {
      BottomAppBar,
      ContentCardList,
    },
    mixins: [commonCoreStrings, commonCoach, responsiveWindowMixin],
    data() {
      return {
        // showError: false,
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
    },
    methods: {
      finishProcess() {
        return;

        // this.$router.push({ name: PageNames.EXAM_CREATION_QUESTION_SELECTION });
      },
    },
    $trs: {
      createNewExamLabel: 'Create new quiz',
      selectChannelQuizLabel: 'Select a channel quiz',
      // noneSelected: 'No exercises are selected',
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    display: inline-block;
    vertical-align: middle;
  }

</style>

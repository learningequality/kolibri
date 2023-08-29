<template>

  <CoachImmersivePage
    :appBarTitle="$tr('createNewExamLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="$tr('createNewExamLabel')"
    :route="$router.back()"
  >
    <KRouterLink
      appearance="raised-button"
      :to="{ path: 'new/123/edit' }"
      text="Test Section Editor"
    />

    <KRouterLink
      appearance="raised-button"
      :to="{ path: 'new/123/replace-questions' }"
      text="Test Replace Questions"
    />

    <KPageContainer
      :style="{ ...maxContainerHeight, maxWidth: '1000px', margin: '0 auto' }"
    >

      <CreateQuizSection />

      <BottomAppBar>
        <KButtonGroup>
          <KButton
            :text="coreString('saveAction')"
            primary
            @click="() => quizForge.saveQuiz()"
          />
        </KButtonGroup>
      </BottomAppBar>

    </KPageContainer>

    <SectionSidePanel />

  </CoachImmersivePage>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import pickBy from 'lodash/pickBy';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import useQuizCreation from '../../../composables/useQuizCreation';
  import CreateQuizSection from './CreateQuizSection.vue';
  import SectionSidePanel from './SectionSidePanel.vue';

  const quizForge = useQuizCreation();

  export default {
    name: 'CreateExamPage',
    components: {
      SectionSidePanel,
      UiAlert,
      CoachImmersivePage,
      BottomAppBar,
      CreateQuizSection,
    },
    mixins: [commonCoreStrings, commonCoach, responsiveWindowMixin],
    data() {
      return {
        quizForge,
      };
    },
    /**
     * @returns {object}
     * @property {object} quizForge - see useQuizCreation for details; this is a reflection of
     *                                the object returned by that function which is initialized
     *                                within this component
     * add `inject: ['quizForge']` to any descendant component to access this
     */
    provide() {
      return {
        quizForge: this.quizForge,
      };
    },
    computed: {
      maxContainerHeight() {
        return { maxHeight: '1000px' };
      },
    },
    watch: {
      filters(newVal) {
        this.$router.push({
          query: { ...this.$route.query, ...pickBy(newVal) },
        });
      },
    },
    created() {
      this.quizForge.initializeQuiz();
    },
    $trs: {
      createNewExamLabel: {
        message: 'Create new quiz',
        context: "Title of the screen launched from the 'New quiz' button on the 'Plan' tab.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>

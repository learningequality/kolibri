<template>

  <CoachImmersivePage
    :appBarTitle="$tr('createNewExamLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="$tr('createNewExamLabel')"
    :route="backRoute"
  >
    <UiAlert
      v-if="showError && !inSearchMode"
      type="error"
      :dismissible="false"
    >
      {{ selectionIsInvalidText }}
    </UiAlert>

    <KPageContainer
      :style="{ maxWidth: '1000px', margin: '0 auto 2em' }"
    >

      <CreateQuizSection v-if="quizInitialized" />

      <BottomAppBar>
        <KButtonGroup>
          <KButton
            :text="coreString('saveAction')"
            primary
            @click="() => saveQuizAndRedirect()"
          />
        </KButtonGroup>
      </BottomAppBar>

    </KPageContainer>

  </CoachImmersivePage>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import pickBy from 'lodash/pickBy';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../../constants';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import useQuizCreation from '../../../composables/useQuizCreation';
  import CreateQuizSection from './CreateQuizSection.vue';

  export default {
    name: 'CreateExamPage',
    components: {
      CoachImmersivePage,
      BottomAppBar,
      CreateQuizSection,
    },
    mixins: [commonCoreStrings, commonCoach],
    setup() {
      const { saveQuiz, initializeQuiz } = useQuizCreation();
      const showError = ref(false);
      const quizInitialized = ref(false);
      return { showError, saveQuiz, initializeQuiz, quizInitialized };
    },
    provide() {
      return {
        showError: this.showError,
        moreResultsState: null,
        // null corresponds to 'All' filter value
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        // numQuestionsBlurred: false,
        bookmarksCount: 0,
        bookmarks: [],
        more: null,
        // showSectionSettingsMenu:false
      };
    },
    computed: {
      backRoute() {
        return { name: PageNames.EXAMS };
      },
    },
    watch: {
      $route: function() {
        // FIXME Coach shouldn't be setting loading in a beforeEach here maybe?
        this.$store.dispatch('notLoading');
      },
      filters(newVal) {
        this.$router.push({
          query: { ...this.$route.query, ...pickBy(newVal) },
        });
      },
    },
    mounted() {
      this.$store.dispatch('notLoading');
    },
    created() {
      this.initializeQuiz(this.$route.params.classId);
      this.quizInitialized = true;
    },
    methods: {
      saveQuizAndRedirect() {
        this.saveQuiz().then(() => {
          this.$router.replace({
            name: PageNames.EXAMS,
            classId: this.$route.params.classId,
          });
        });
      },
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

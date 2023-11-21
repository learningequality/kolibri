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
      :style="{ ...maxContainerHeight, maxWidth: '1000px', margin: '0 auto' }"
    >

      <CreateQuizSection v-if="quizInitialized" />

      <BottomAppBar>
        <KButtonGroup>
          <KButton
            :text="coreString('saveAction')"
            primary
            @click="() => saveQuiz()"
          />
        </KButtonGroup>
      </BottomAppBar>

    </KPageContainer>

  </CoachImmersivePage>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
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
    mixins: [commonCoreStrings, commonCoach, responsiveWindowMixin],
    setup() {
      const { saveQuiz, initializeQuiz } = useQuizCreation();
      const quizInitialized = ref(false);
      return { saveQuiz, initializeQuiz, quizInitialized };
    },
    provide() {
      return {
        showError: false,
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
      maxContainerHeight() {
        return { maxHeight: '1000px' };
      },
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
      this.initializeQuiz();
      this.quizInitialized = true;
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

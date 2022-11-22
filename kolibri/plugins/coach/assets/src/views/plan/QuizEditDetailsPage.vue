<template>

  <NotificationsRoot
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
  >
    <ImmersivePage
      :appBarTitle="$tr('appBarTitle')"
      icon="close"
      :route="previousPageRoute"
    >
      <KPageContainer
        v-if="!loading && !error"
        :topMargin="100"
      >
        <AssignmentDetailsForm
          v-bind="formProps"
          :disabled="disabled"
          :initialAdHocLearners="quiz.learner_ids"
          @cancel="goBackToSummaryPage"
          @submit="handleSaveChanges"
        />
      </KPageContainer>
    </ImmersivePage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { ExamResource } from 'kolibri.resources';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import AssignmentDetailsModal from './assignments/AssignmentDetailsModal';

  export default {
    name: 'QuizEditDetailsPage',
    metaInfo() {
      return {
        title: this.$tr('pageTitle', { title: this.quiz.title }),
      };
    },
    components: {
      ImmersivePage,
      AssignmentDetailsForm: AssignmentDetailsModal,
      NotificationsRoot,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    data() {
      return {
        quiz: {
          title: '',
          assignments: [],
          learner_ids: [],
          active: false,
        },
        loading: true,
        error: false,
        disabled: false,
      };
    },
    computed: {
      ...mapGetters('classSummary', ['groups']),
      formProps() {
        return {
          assignmentType: 'quiz',
          classId: this.$route.params.classId,
          groups: this.groups,
          initialActive: this.quiz.active,
          initialSelectedCollectionIds: this.quiz.assignments,
          initialTitle: this.quiz.title,
          submitErrorMessage: this.$tr('submitErrorMessage'),
        };
      },
      previousPageRoute() {
        let route;
        if (this.$route.name === 'QuizEditDetailsPage') {
          route = 'QuizSummaryPage';
        } else {
          // If coming from Quiz Report
          route = 'ReportsQuizLearnerListPage';
        }
        return this.$router.getRoute(route);
      },
    },
    beforeRouteEnter(to, from, next) {
      return ExamResource.fetchModel({
        id: to.params.quizId,
      })
        .then(quiz => {
          next(vm => {
            vm.setData(quiz);
          });
        })
        .catch(error => {
          next(vm => vm.setError(error));
        });
    },
    methods: {
      // @public
      setData(data) {
        this.quiz = data;
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      // @public
      setError(error) {
        this.$store.dispatch('handleApiError', error);
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      goBackToSummaryPage() {
        return this.$router.push(this.previousPageRoute);
      },
      handleSaveChanges(changes) {
        let promise;

        this.disabled = true;
        if (changes === null) {
          promise = Promise.resolve();
        } else {
          promise = ExamResource.saveModel({
            id: this.$route.params.quizId,
            data: changes,
          });
        }
        return promise
          .then(() => {
            this.goBackToSummaryPage().then(() => {
              this.showSnackbarNotification('changesSaved');
            });
          })
          .catch(() => {
            this.disabled = false;
            this.$store.dispatch('createSnackbar', this.$tr('submitErrorMessage'));
          });
      },
    },
    $trs: {
      pageTitle: {
        message: `Edit quiz details for '{title}'`,
        context:
          "Title of the page accessed via the 'Edit details' option on the Plan > Quizzes page. (Not seen in the UI)\n",
      },
      appBarTitle: {
        message: `Edit quiz details`,
        context:
          "Title of the screen accessed via the 'Edit details' option on the Plan > Quizzes page.",
      },
      submitErrorMessage: {
        message: 'There was a problem saving your changes',
        context: 'Generic error message.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>

<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    :appBarTitle="$tr('appBarTitle')"
    :pageTitle="$tr('pageTitle', { title: quiz.title })"
    :showSubNav="false"
    :immersivePageRoute="previousPageRoute"
  >

    <KPageContainer v-if="!loading && !error">
      <AssignmentDetailsForm
        v-bind="formProps"
        :disabled="disabled"
        @cancel="goBackToSummaryPage"
        @submit="handleSaveChanges"
      />
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { ExamResource } from 'kolibri.resources';
  import { CoachCoreBase } from '../common';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import AssignmentDetailsModal from './assignments/AssignmentDetailsModal';

  export default {
    name: 'QuizEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoreBase: CoachCoreBase,
    },
    mixins: [coachStringsMixin],
    props: {},
    data() {
      return {
        quiz: {
          title: '',
          assignments: [],
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
          initialSelectedCollectionIds: this.quiz.assignments.map(({ collection }) => collection),
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
          next(vm => vm.setData(quiz));
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
        this.$router.push(this.previousPageRoute);
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
            this.goBackToSummaryPage();
          })
          .catch(() => {
            this.disabled = false;
            this.$store.dispatch('createSnackbar', this.$tr('submitErrorMessage'));
          });
      },
    },
    $trs: {
      pageTitle: `Edit quiz details for '{title}'`,
      appBarTitle: `Edit quiz details`,
      submitErrorMessage: 'There was a problem saving your changes',
    },
  };

</script>


<style lang="scss" scoped></style>

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
        :initialAdHocLearners="initialAdHocLearners"
        @cancel="goBackToSummaryPage"
        @submit="handleSaveChanges"
      />
    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { ExamResource } from 'kolibri.resources';
  import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
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
      ...mapGetters('adHocLearners', ['hasAdHocLearnersAssigned']),
      formProps() {
        return {
          assignmentType: 'quiz',
          classId: this.$route.params.classId,
          groups: this.groups,
          initialActive: this.quiz.active,
          initialSelectedCollectionIds: this.initialSelectedCollectionIds,
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
      initialSelectedCollectionIds() {
        let collectionIds = [];
        // Only include the AdHocGroup in this if it has already
        // had learners assigned to it.
        this.quiz.assignments.forEach(assignment => {
          if (assignment.collection_kind === CollectionKinds.ADHOCLEARNERSGROUP) {
            if (this.hasAdHocLearnersAssigned) {
              collectionIds.push(assignment.collection);
            }
          } else {
            collectionIds.push(assignment.collection);
          }
        });
        return collectionIds;
      },
      initialAdHocLearners() {
        return this.$store.state.adHocLearners.user_ids;
      },
    },
    beforeRouteEnter(to, from, next) {
      return ExamResource.fetchModel({
        id: to.params.quizId,
      })
        .then(quiz => {
          next(vm => {
            const collection = quiz.assignments.find(
              a => a.collection_kind === CollectionKinds.ADHOCLEARNERSGROUP
            );
            if (collection) {
              vm.$store
                .dispatch('adHocLearners/initializeAdHocLearnersGroup', collection.collection)
                .then(() => vm.setData(quiz));
            } else {
              // There is no "ad hoc learners group" assigned to this quiz, so
              // we will make one. This will also set the newly created individual learners
              // group to the adHocLearners vuex state.
              vm.$store
                .dispatch('adHocLearners/createAdHocLearnersGroup', {
                  classId: vm.$route.params.classId,
                })
                .then(() => {
                  // Save the Exam with the new assignment
                  ExamResource.saveModel({
                    id: vm.$route.params.quizId,
                    data: {
                      assignments: [
                        ...quiz.assignments,
                        { collection: vm.$store.state.adHocLearners.id },
                      ],
                    },
                  }).then(() => vm.setData(quiz));
                });
            }
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

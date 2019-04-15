<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    :appBarTitle="$tr('appBarTitle', { title: lesson.title })"
    :pageTitle="$tr('appBarTitle', { title: lesson.title })"
    :showSubNav="false"
    :immersivePageRoute="$router.getRoute('SUMMARY')"
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
  import { LessonResource } from 'kolibri.resources';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import { CoachCoreBase } from '../common';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import AssignmentDetailsModal from './assignments/AssignmentDetailsModal';

  export default {
    name: 'LessonEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoreBase: CoachCoreBase,
      KPageContainer,
    },
    mixins: [coachStringsMixin],
    data() {
      return {
        lesson: {
          title: '',
          description: '',
          assignments: [],
          active: false,
        },
        loading: true,
        error: false,
        disabled: false,
      };
    },
    beforeRouteEnter(to, from, next) {
      return LessonResource.fetchModel({
        id: to.params.lessonId,
      }).then(lesson => {
        next(vm => vm.setData(lesson));
      });
    },
    computed: {
      ...mapGetters('classSummary', ['groups']),
      formProps() {
        return {
          classId: this.$route.params.classId,
          groups: this.groups,
          initialActive: this.lesson.is_active,
          initialSelectedCollectionIds: this.lesson.lesson_assignments.map(
            ({ collection }) => collection
          ),
          initialTitle: this.lesson.title,
          initialDescription: this.lesson.description,
          modalActiveText: this.$tr('activeLessonLabel'),
          modalInactiveText: this.$tr('inactiveLessonLabel'),
          showActiveOption: true,
          showDescriptionField: true,
          submitErrorMessage: this.$tr('submitErrorMessage'),
        };
      },
    },
    methods: {
      setData(data) {
        this.lesson = data;
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      goBackToSummaryPage() {
        this.$router.push(this.$router.getRoute('SUMMARY'));
      },
      handleSaveChanges(changes) {
        let promise;

        this.disabled = true;
        if (changes === null) {
          promise = Promise.resolve();
        } else {
          promise = LessonResource.saveModel({
            id: this.$route.params.lessonId,
            data: {
              title: changes.title,
              description: changes.description,
              lesson_assignments: changes.assignments,
              is_active: changes.active,
            },
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
      appBarTitle: `Edit lesson details for '{title}'`,
      submitErrorMessage: 'There was a problem saving your changes',
      activeLessonLabel: 'Active',
      inactiveLessonLabel: 'Inactive',
    },
  };

</script>


<style lang="scss" scoped></style>

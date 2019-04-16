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
    :immersivePageRoute="previousPageRoute"
  >

    <KPageContainer v-if="!loading && !error">
      <AssignmentDetailsForm
        v-bind="formProps"
        :disabled="disabled"
        @cancel="goBackToSummaryPage"
        @submit="handleSaveChanges"
      >

        <section
          v-if="showResourcesTable"
          slot="resourceTable"
        >
          <h2 class="resource-header">
            {{ $tr('resourceTableHeader') }}
          </h2>
          <ResourceListTable
            :resources.sync="lesson.resources"
          />
        </section>
      </AssignmentDetailsForm>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { LessonResource } from 'kolibri.resources';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import { CoachCoreBase } from '../../common';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import ResourceListTable from './EditDetailsResourceListTable';

  export default {
    name: 'LessonEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoreBase: CoachCoreBase,
      KPageContainer,
      ResourceListTable,
    },
    mixins: [coachStringsMixin],
    props: {
      showResourcesTable: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        lesson: {
          title: '',
          description: '',
          assignments: [],
          resources: [],
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
          assignmentType: 'lesson',
          classId: this.$route.params.classId,
          groups: this.groups,
          initialActive: this.lesson.is_active,
          initialSelectedCollectionIds: this.lesson.lesson_assignments.map(
            ({ collection }) => collection
          ),
          initialTitle: this.lesson.title,
          initialDescription: this.lesson.description,
          submitErrorMessage: this.$tr('submitErrorMessage'),
        };
      },
      previousPageRoute() {
        let route;
        if (this.$route.name === 'LessonEditDetailsPage') {
          // i.e. Lesson Summary
          route = 'SUMMARY';
        } else {
          route = 'ReportsLessonReportPage';
        }
        return this.$router.getRoute(route);
      },
    },
    methods: {
      setData(data) {
        this.lesson = data;
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
      resourceTableHeader: 'Resources',
    },
  };

</script>


<style lang="scss" scoped>

  // To match the size of the <legend>s in the form
  .resource-header {
    font-size: 18px;
  }

</style>

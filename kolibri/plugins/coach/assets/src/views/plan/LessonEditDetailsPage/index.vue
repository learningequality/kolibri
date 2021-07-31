<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    :appBarTitle="$tr('appBarTitle')"
    :pageTitle="$tr('pageTitle', { title: lesson.title })"
    :showSubNav="false"
    :immersivePageRoute="previousPageRoute"
  >

    <KPageContainer v-if="!loading">
      <AssignmentDetailsForm
        v-bind="formProps"
        :disabled="disabled"
        @cancel="goBackToSummaryPage"
        @submit="handleSaveChanges"
      >

        <template #resourceTable>
          <section v-if="showResourcesTable">
            <h2 class="resource-header">
              {{ coreString('resourcesLabel') }}
            </h2>
            <ResourceListTable
              v-show="!disabled"
              :resources.sync="updatedResources"
            />
          </section>
        </template>
      </AssignmentDetailsForm>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import { LessonResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { CoachCoreBase } from '../../common';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import ResourceListTable from './EditDetailsResourceListTable';

  export default {
    name: 'LessonEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoreBase: CoachCoreBase,
      ResourceListTable,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
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
          lesson_assignments: [],
          resources: [],
          is_active: false,
        },
        // A copy of lesson.resources
        updatedResources: [],
        loading: true,
        disabled: false,
      };
    },
    computed: {
      formProps() {
        return {
          assignmentType: 'lesson',
          classId: this.$route.params.classId,
          groups: this.$store.getters['classSummary/groups'],
          initialActive: this.lesson.is_active,
          initialAdHocLearners: this.lesson.learner_ids,
          initialSelectedCollectionIds: this.lesson.lesson_assignments,
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
    beforeRouteEnter(to, from, next) {
      return LessonResource.fetchModel({
        id: to.params.lessonId,
      })
        .then(lesson => {
          next(vm => {
            vm.setData(lesson);
          });
        })
        .catch(error => {
          next(vm => vm.setError(error));
        });
    },
    methods: {
      // @public
      setData(data) {
        this.lesson = data;
        this.updatedResources = [...data.resources];
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
      handleSaveChanges(newDetails) {
        this.disabled = true;
        const data = {
          description: newDetails.description,
          lesson_assignments: newDetails.assignments,
          title: newDetails.title,
          learner_ids: newDetails.learner_ids,
        };

        if (this.showResourcesTable && !isEqual(this.lesson.resources, this.updatedResources)) {
          Object.assign(data, {
            resources: this.updatedResources,
          });
        }

        return LessonResource.saveModel({ id: this.$route.params.lessonId, data })
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
        message: `Edit lesson details for '{title}'`,
        context:
          "Page title for page which coach accesses using the 'Edit details' option on the 'Plan' tab.\n",
      },
      appBarTitle: {
        message: 'Edit lesson details',
        context:
          "Title of window that displays when coach uses the 'Edit details' option on the 'Plan' tab.",
      },
      submitErrorMessage: {
        message: 'There was a problem saving your changes',
        context: 'Generic error message.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  // To match the size of the <legend>s in the form
  .resource-header {
    font-size: 18px;
  }

</style>

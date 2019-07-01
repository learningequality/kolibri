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

        <section
          v-if="showResourcesTable"
          slot="resourceTable"
        >
          <h2 class="resource-header">
            {{ $tr('resourceTableHeader') }}
          </h2>
          <ResourceListTable
            v-show="!disabled"
            :resources.sync="updatedResources"
          />
        </section>
      </AssignmentDetailsForm>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import isEmpty from 'lodash/isEmpty';
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
    beforeRouteEnter(to, from, next) {
      return LessonResource.fetchModel({
        id: to.params.lessonId,
      })
        .then(lesson => {
          next(vm => vm.setData(lesson));
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
        this.$router.push(this.previousPageRoute);
      },
      saveLessonModel(data) {
        if (isEmpty(data)) {
          return Promise.resolve();
        } else {
          return LessonResource.saveModel({ id: this.$route.params.lessonId, data });
        }
      },
      handleSaveChanges(newDetails) {
        this.disabled = true;
        const data = {};

        if (newDetails) {
          Object.assign(data, {
            description: newDetails.description,
            is_active: newDetails.active,
            lesson_assignments: newDetails.assignments,
            title: newDetails.title,
          });
        }

        if (this.showResourcesTable && !isEqual(this.lesson.resources, this.updatedResources)) {
          Object.assign(data, {
            resources: this.updatedResources,
          });
        }

        return this.saveLessonModel(data)
          .then(this.goBackToSummaryPage)
          .catch(() => {
            this.disabled = false;
            this.$store.dispatch('createSnackbar', this.$tr('submitErrorMessage'));
          });
      },
    },
    $trs: {
      pageTitle: `Edit lesson details for '{title}'`,
      appBarTitle: 'Edit lesson details',
      submitErrorMessage: 'There was a problem saving your changes',
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

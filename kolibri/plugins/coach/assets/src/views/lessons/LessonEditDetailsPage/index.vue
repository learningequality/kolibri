<template>

  <CoachImmersivePage
    :appBarTitle="$tr('appBarTitle')"
    :authorized="$store.getters.userIsAuthorizedForCoach"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="$tr('pageTitle', { title: lesson.title })"
    :route="previousPageRoute"
  >
    <KPageContainer v-if="!loading">
      <AssignmentDetailsForm
        v-bind="formProps"
        :disabled="disabled"
        @cancel="goBackToSummaryPage"
        @submit="handleSaveChanges"
      />

      <section v-if="showResourcesTable">
        <h2 class="resource-header">
          {{ coreString('resourcesLabel') }}
        </h2>
        <ResourceListTable
          v-show="!disabled"
          :resources.sync="updatedResources"
        />
      </section>
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import LessonResource from 'kolibri-common/apiResources/LessonResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import AssignmentDetailsModal from '../../common/assignments/AssignmentDetailsModal';
  import { PageNames } from '../../../constants';
  import ResourceListTable from './EditDetailsResourceListTable';

  export default {
    name: 'LessonEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoachImmersivePage,
      ResourceListTable,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { isSuperuser } = useUser();

      return {
        createSnackbar,
        isSuperuser,
      };
    },
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
          assignment: this.lesson,
          classId: this.$route.params.classId,
          groups: this.$store.getters['classSummary/groups'],
        };
      },
      previousPageRoute() {
        return this.$router.getRoute(PageNames.LESSON_SUMMARY);
      },
    },
    created() {
      const initClassInfoPromise = this.$store.dispatch(
        'initClassInfo',
        this.$route.params.classId,
      );
      const getFacilitiesPromise =
        this.isSuperuser && this.$store.state.core.facilities.length === 0
          ? this.$store.dispatch('getFacilities').catch(() => {})
          : Promise.resolve();

      Promise.all([initClassInfoPromise, getFacilitiesPromise])
        .then(() =>
          LessonResource.fetchModel({
            id: this.$route.params.lessonId,
          }),
        )
        .then(lesson => this.setData(lesson))
        .catch(error => this.setError(error))
        .then(() => this.$store.dispatch('notLoading'));
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
        this.$store.dispatch('handleApiError', { error });
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
          assignments: newDetails.assignments,
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
            this.createSnackbar(this.$tr('submitErrorMessage'));
          });
      },
    },
    $trs: {
      pageTitle: {
        message: `Edit lesson details for '{title}'`,
        context:
          "Page title for page which coach accesses using the 'Edit details' option on the Lessons tab.",
      },
      appBarTitle: {
        message: 'Edit lesson details',
        context:
          "Title of window that displays when coach uses the 'Edit details' option on the 'Lessons' tab.",
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

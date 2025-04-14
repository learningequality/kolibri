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
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import LessonResource from 'kolibri-common/apiResources/LessonResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import AssignmentDetailsModal from '../../common/assignments/AssignmentDetailsModal';
  import { PageNames } from '../../../constants';

  export default {
    name: 'LessonEditDetailsPage',
    components: {
      AssignmentDetailsForm: AssignmentDetailsModal,
      CoachImmersivePage,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { isSuperuser } = useUser();
      const { getFacilities, facilities } = useFacilities();
      return {
        createSnackbar,
        isSuperuser,
        getFacilities,
        facilities,
      };
    },
    data() {
      return {
        lesson: {
          title: '',
          description: '',
          assignments: [],
          active: false,
        },
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
        this.isSuperuser && this.facilities.length === 0
          ? this.getFacilities().catch(() => {})
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
          "Page title for page which coach accesses using the 'Edit details' option on the Plan > Lessons tab.",
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

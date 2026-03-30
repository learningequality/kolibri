<template>

  <CoachImmersivePage
    :appBarTitle="coachString('createLessonAction')"
    :authorized="true"
    authorizedRole="adminOrCoach"
    icon="close"
    :pageTitle="coachString('createLessonAction')"
    :route="{ name: 'LESSONS_ROOT', params: { classId } }"
  >
    <KPageContainer>
      <AssignmentDetailsModal
        ref="detailsModal"
        assignmentType="lesson"
        :assignment="{ assignments: [classId] }"
        :classId="classId"
        :groups="groups"
        :disabled="false"
        @submit="createLesson"
        @cancel="() => $router.go(-1)"
      />
    </KPageContainer>
  </CoachImmersivePage>

</template>


<script>

  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import AssignmentDetailsModal from '../common/assignments/AssignmentDetailsModal';
  import commonCoach from '../common';
  import CoachImmersivePage from '../CoachImmersivePage';

  export default {
    name: 'LessonCreationPage',
    components: {
      AssignmentDetailsModal,
      CoachImmersivePage,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      classId() {
        return this.$route.params.classId;
      },
    },
    created() {
      const { fetchFacilities, facilities } = useFacilities();
      const initClassInfoPromise = this.$store.dispatch('initClassInfo', this.classId);
      const getFacilitiesPromise =
        this.isSuperuser && facilities.value.length === 0
          ? fetchFacilities().catch(() => {})
          : Promise.resolve();

      Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    },
    mounted() {
      this.$store.commit('CORE_SET_PAGE_LOADING', false);
    },
    methods: {
      createLesson(payload) {
        this.$store
          .dispatch('lessonsRoot/createLesson', {
            classId: this.classId,
            payload,
          })
          .then(() => {
            this.showSnackbarNotification('lessonCreated');
          })
          .catch(error => {
            const errors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (errors) {
              this.$refs.detailsModal.handleSubmitTitleFailure();
            } else if (error.response && error.response.data && error.response.data.learner_ids) {
              this.$refs.detailsModal.handleSubmitDeletedUsersFailure();
            } else {
              this.$refs.detailsModal.handleSubmitFailure();
            }
          });
      },
    },
  };

</script>


<style lang="scss" scoped></style>

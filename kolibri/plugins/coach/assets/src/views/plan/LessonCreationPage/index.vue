<template>

  <NotificationsRoot
    :authorized="true"
    authorizedRole="adminOrCoach"
  >
    <ImmersivePage
      :appBarTitle="coachString('createLessonAction')"
      icon="close"
      :route="{ name: 'PLAN_LESSONS_ROOT' }"
    >
      <KPageContainer
        :topMargin="100"
      >
        <AssignmentDetailsModal
          ref="detailsModal"
          assignmentType="new_lesson"
          :modalTitleErrorMessage="coachString('duplicateLessonTitleError')"
          :submitErrorMessage="coachString('saveLessonError')"
          :initialDescription="''"
          :initialTitle="''"
          :initialSelectedCollectionIds="[classId]"
          :initialAdHocLearners="[]"
          :classId="classId"
          :groups="groups"
          :disabled="false"
          @submit="createLesson"
          @cancel="() => $router.go(-1)"
        />
      </KPageContainer>
    </ImmersivePage>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import commonCoach from '../../common';

  export default {
    name: 'LessonCreationPage',
    metaInfo() {
      return {
        title: this.coachString('createLessonAction'),
      };
    },
    components: {
      AssignmentDetailsModal,
      ImmersivePage,
      NotificationsRoot,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      classId() {
        return this.$route.params.classId;
      },
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
            } else {
              this.$refs.detailsModal.handleSubmitFailure();
            }
          });
      },
    },
  };

</script>


<style lang="scss" scoped></style>

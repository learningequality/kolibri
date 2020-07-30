<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :immersivePageRoute="{ name: 'PLAN_LESSONS_ROOT' }"
    :appBarTitle="lessonCreationStrings.$tr('newLessonModalTitle')"
    :authorized="true"
    authorizedRole="adminOrCoach"
    :pageTitle="lessonCreationStrings.$tr('newLessonModalTitle')"
    :marginBottom="72"
  >
    <KPageContainer>
      <AssignmentDetailsModal
        ref="detailsModal"
        assignmentType="new_lesson"
        :modalTitleErrorMessage="lessonCreationStrings.$tr('duplicateTitle')"
        :submitErrorMessage="lessonCreationStrings.$tr('saveLessonError')"
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
  </CoreBase>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import LessonRootPage from '../LessonsRootPage';
  import commonCoach from '../../common';

  export default {
    name: 'LessonCreationPage',
    components: { AssignmentDetailsModal },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      classId() {
        return this.$route.params.classId;
      },
      lessonCreationStrings() {
        return crossComponentTranslator(LessonRootPage);
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
          });
      },
    },
  };

</script>


<style lang="scss" scoped></style>

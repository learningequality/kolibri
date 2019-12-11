<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="close"
    :immersivePagePrimary="false"
    :immersivePageRoute="{ name: 'PLAN_LESSONS_ROOT' }"
    appBarTitle="$tr('createNewExamLabel')"
    :authorized="true"
    authorizedRole="adminOrCoach"
    pageTitle="$tr('createNewExamLabel')"
    :marginBottom="72"
  >
    <KPageContainer>
      <AssignmentDetailsModal
        ref="detailsModal"
        assignmentType="new_lesson"
        modalTitleErrorMessage="errrrrrir"
        submitErrorMessage="moreerror"
        :initialDescription="''"
        :initialTitle="''"
        :initialSelectedCollectionIds="[classId]"
        :classId="classId"
        :groups="[]"
        :disabled="false"
        @submit="() => null"
        @cancel="showModal=false"
      />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import AssignmentDetailsModal from '../assignments/AssignmentDetailsModal';
  import commonCoach from '../../common';

  export default {
    name: 'LessonCreationPage',
    components: { AssignmentDetailsModal },
    mixins: [commonCoach],
    computed: {
      classId() {
        return this.$route.params.classId;
      },
    },
    mounted() {
      this.$store.commit('CORE_SET_PAGE_LOADING', false);
    },
  };

</script>


<style lang="scss" scoped></style>

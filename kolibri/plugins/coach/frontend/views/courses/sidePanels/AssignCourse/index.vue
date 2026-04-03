<template>

  <SidePanelModal @closePanel="closeSidePanel">
    <!--
      Router view for subpages navigation implemented in AssignCourse/subPages/...
      whose routes are defined in coach/frontend/routes/coursesRoutes.js
    -->
    <router-view
      @closePanel="closeSidePanel"
      @success="onSuccess"
    />
    <CloseConfirmationModal
      ref="closeConfirmationGuardRef"
      :hasUnsavedChanges="hasUnsavedChanges"
    />
  </SidePanelModal>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { computed, ref, nextTick } from 'vue';
  import { isNavigationFailure, NavigationFailureType } from 'vue-router';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { CoursesModals, PageNames } from '../../../../constants';
  import { overrideRoute } from '../../../../utils';
  import { injectAssignCourse } from '../../composables/useAssignCourse';
  import CloseConfirmationModal from '../../modals/CloseConfirmationModal.vue';

  /**
   * This component will serve as the root component for the
   * "Assign Course" side panel, providing the SidePanelModal wrapper, and the
   * router-view for the subpages within the side panel.
   *
   * This component will instantiate the `useAssignCourse` composable to define the data
   * scope for all subpages within the side panel, and will make it available to all
   * subpages through the provide/inject pattern.
   * Data Flow:
   * - This component provides shared assignment data to child components
   * - Child components inject the data they need for their specific concerns
   * - Navigation between subpages is handled through Vue Router
   *
   * You can see what subpages are available by checking the children routes defined in
   * coach/frontend/routes/coursesRoutes.js under the "COURSES_ASSIGN" route.
   *
   */
  export default {
    name: 'AssignCourseSidePanel',
    components: {
      SidePanelModal,
      CloseConfirmationModal,
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();

      const { selectedCourse, resetAssignment, courseSessionId, hasRecipientChanges } =
        injectAssignCourse();
      const { createSnackbar } = useSnackbar();
      const { changesSavedNotification$ } = coreStrings;

      const isFinished = ref(false);

      const hasUnsavedChanges = computed(() => {
        // If course assignment process is finished, don't show confirmation
        if (isFinished.value) {
          return false;
        }
        if (courseSessionId.value != null) {
          return hasRecipientChanges.value;
        }
        return selectedCourse.value != null;
      });

      const closeSidePanel = () => {
        // When opened from the course summary page, return there; otherwise return to courses list
        const name = route.params.courseSessionId
          ? PageNames.COURSE_SUMMARY
          : PageNames.COURSES_ROOT;
        router
          .push(
            overrideRoute(route, {
              name,
              query: null,
            }),
          )
          .catch(e => {
            if (
              !isNavigationFailure(
                e,
                NavigationFailureType.aborted || NavigationFailureType.duplicated,
              )
            ) {
              throw Error(e);
            }
          });
      };

      const onSuccess = async () => {
        const isEditMode = courseSessionId.value != null;
        isFinished.value = true;
        resetAssignment();
        await nextTick();

        closeSidePanel();

        if (isEditMode) {
          createSnackbar(changesSavedNotification$());
        } else {
          emit('showModal', CoursesModals.ASSIGN_COURSE_SUCCESS);
        }
        emit('refreshData');
      };
      return {
        hasUnsavedChanges,
        closeSidePanel,
        onSuccess,
      };
    },
    beforeRouteLeave(to, from, next) {
      this.$refs.closeConfirmationGuardRef?.beforeRouteLeave(to, from, next);
    },
  };

</script>


<style lang="scss" scoped></style>

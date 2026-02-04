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
  </SidePanelModal>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import { computed } from 'vue';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import { CoursesModals, PageNames } from '../../../../constants';
  import { overrideRoute } from '../../../../utils';
  import useAssignCourse from '../../composables/useAssignCourse';

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
    },
    setup(props, { emit }) {
      const route = useRoute();
      const router = useRouter();

      const classId = computed(() => route.params.classId);
      useAssignCourse({ classId });

      const closeSidePanel = () => {
        router.push(overrideRoute(route, { name: PageNames.COURSES_ROOT }));
      };

      const onSuccess = () => {
        closeSidePanel();
        emit('showModal', CoursesModals.ASSIGN_COURSE_SUCCESS);
        emit('refreshData');
      };
      return {
        closeSidePanel,
        onSuccess,
      };
    },
  };

</script>


<style lang="scss" scoped></style>

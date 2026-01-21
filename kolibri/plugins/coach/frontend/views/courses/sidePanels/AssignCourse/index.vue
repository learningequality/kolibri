<template>

  <SidePanelModal @closePanel="closeSidePanel">
    <!--
      Router view for subpages navigation implemented in AssignCourse/subPages/...
      whose routes are defined in coach/frontend/routes/coursesRoutes.js
    -->
    <router-view @closePanel="closeSidePanel" />
  </SidePanelModal>

</template>


<script>

  import { useRoute, useRouter } from 'vue-router/composables';
  import SidePanelModal from '../../../common/sidePanel/SidePanelModal.vue';
  import { PageNames } from '../../../../constants';
  import { overrideRoute } from '../../../../utils';

  /**
   * This component will serve as the root component for the
   * "Assign Course" side panel, providing the SidePanelModal wrapper, and the
   * router-view for the subpages within the side panel.
   *
   * This component will define the data scope for all subpages within the side panel, and
   * will make it available to all subpages through the provide/inject pattern.
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
    setup() {
      const route = useRoute();
      const router = useRouter();
      const closeSidePanel = () => {
        router.push(overrideRoute(route, { name: PageNames.COURSES_ROOT }));
      };
      return {
        closeSidePanel,
      };
    },
  };

</script>


<style lang="scss" scoped></style>

<template>

  <router-view />

</template>


<script>

  import useLodDeviceUsers from './composables/useLodDeviceUsers';

  /**
   * Wrapper component to initialize the Lod device users composable and
   * provide all the context data needed for the lod users pages.
   * This is to get a clear context of when we are in the Lod device users routes,
   * and properly setup and destroy the lod users import state machine.
   */
  export default {
    name: 'UsersRootPage',
    setup(props) {
      props.beforeRouteEnter?.();
      useLodDeviceUsers();
    },
    props: {
      /**
       * Route handler function to be called as soon as the setup method is executed.
       */
      beforeRouteEnter: {
        type: Function,
        required: false,
        default: null,
      },
    },
  };

</script>

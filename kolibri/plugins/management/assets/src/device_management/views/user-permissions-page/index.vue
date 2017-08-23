<template>

  <immersive-full-screen
    :backPageLink="{ name: 'DEVICE_PERMISSIONS_MGMT_PAGE' }"
    backPageText="David Hu"
    bodyColorHex="#F9F9F9"
    topBarColorHex="#724870"
  >
    <subpage-container withSideMargin>
      <div>
        <h1>Full Name</h1>
        <h2>Username</h2>
      </div>

      <div class="superuser-section">
        <label>
          <input type="checkbox" />
          <h2>Make Superuser</h2>
          <p>A superuser has all device permissions and is able to manage permissions of other users</p>
        </label>
      </div>

      <div class="device-permissions-section">
        <h2>Device Permissions</h2>
        <label>
          <input type="checkbox" />
          <p>Can import and export content channels</p>
        </label>
      </div>

      <div class="buttons">
        <button>
          Save Changes
        </button>
        <button>
          Cancel
        </button>
      </div>
    </subpage-container>

  </immersive-full-screen>

</template>


<script>

  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import subpageContainer from '../containers/subpage-container';

  export default {
    components: {
      immersiveFullScreen,
      subpageContainer,
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {},
      actions: {},
    },
  };

</script>


<style lang="stylus" scoped>

  @require '../../../management-styles.styl'

</style>

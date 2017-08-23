<template>

  <immersive-full-screen
    :backPageLink="{ name: 'DEVICE_PERMISSIONS_MGMT_PAGE' }"
    :backPageText="user.full_name"
    bodyColorHex="#F9F9F9"
    topBarColorHex="#724870"
  >
    <subpage-container withSideMargin>
      <div>
        <h1>{{ user.full_name }}</h1>
        <h3>{{ user.username }}</h3>
      </div>

      <div class="superuser-section">
        <k-checkbox
          :label="$tr('makeSuperuser')"
          :checked="true"
        />
        <p>{{ $tr('makeSuperuserDetails') }}</p>
      </div>

      <hr />

      <div class="device-permissions-section">
        <h2>{{ $tr('devicePermissions') }}</h2>
        <k-checkbox
          :label="$tr('devicePermissionsDetails')"
          :checked="true"
        />
      </div>

      <div class="buttons">
        <k-button :text="$tr('saveButton')" class="no-margin" :primary="true" :raised="true" />
        <k-button :text="$tr('cancelButton')" :primary="false" :raised="false" />
      </div>
    </subpage-container>

  </immersive-full-screen>

</template>


<script>

  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import subpageContainer from '../containers/subpage-container';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';

  export default {
    components: {
      immersiveFullScreen,
      kButton,
      kCheckbox,
      subpageContainer,
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {
        user: ({ pageState }) => pageState.user,
      },
      actions: {},
    },
    $trs: {
      makeSuperuser: 'Make Superuser',
      makeSuperuserDetails: 'A superuser has all device permissions and is able to manage permissions of other users',
      devicePermissions: 'Device Permissions',
      devicePermissionsDetails: 'Can import and export content channels',
      saveButton: 'Save Changes',
      cancelButton: 'Cancel',
    }
  };

</script>


<style lang="stylus" scoped>

  @require '../../../management-styles.styl'

  .no-margin
    margin-left: 0

</style>

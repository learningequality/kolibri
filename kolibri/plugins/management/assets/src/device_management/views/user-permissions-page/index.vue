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
          :disabled="superuserDisabled"
          :label="$tr('makeSuperuser')"
          :checked="superuserChecked"
          @change="superuserChecked=$event"
        />
        <p>{{ $tr('makeSuperuserDetails') }}</p>
      </div>

      <hr />

      <div class="device-permissions-section">
        <h2>{{ $tr('devicePermissions') }}</h2>
        <k-checkbox
          :disabled="devicePermissionsDisabled"
          :label="$tr('devicePermissionsDetails')"
          :checked="devicePermissionsChecked"
          @change="devicePermissionsChecked=$event"
        />
      </div>

      <div class="buttons">
        <k-button
          :disabled="saveDisabled"
          :text="$tr('saveButton')"
          class="no-margin"
          :primary="true"
          :raised="true"
          @click="save()"
        />
        <k-button
          :disabled="uiBlocked"
          :text="$tr('cancelButton')"
          :primary="false"
          :raised="false"
          @click="goBack()"
        />
      </div>
      <div v-show="uiBlocked">
        {{ progressNotification }}
      </div>
      <div v-show="saveProgress==='FAILURE'">
        {{ $tr('saveFailureNotification') }}
      </div>
    </subpage-container>

  </immersive-full-screen>

</template>


<script>

  import immersiveFullScreen from 'kolibri.coreVue.components.immersiveFullScreen';
  import subpageContainer from '../containers/subpage-container';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import { addOrUpdateUserPermissions } from '../../state/actions/permissionsActions';

  export default {
    name: 'userPermissionsPage',
    components: {
      immersiveFullScreen,
      kButton,
      kCheckbox,
      subpageContainer,
    },
    data() {
      return {
        devicePermissionsChecked: undefined,
        saveProgress: undefined,
        superuserChecked: undefined,
        uiBlocked: false,
      }
    },
    computed: {
      superuserDisabled() {
        return this.uiBlocked || this.isCurrentUser;
      },
      saveDisabled() {
        return this.uiBlocked || this.isCurrentUser;
      },
      devicePermissionsDisabled() {
        return this.uiBlocked || this.superuserChecked;
      },
      progressNotification() {
        switch (this.saveProgress) {
          case 'IN_PROGRESS':
            return this.$tr('saveInProgressNotification');
          case 'SUCCESS':
            return this.$tr('saveSuccessfulNotification');
          default:
            return '';
        }
      }
    },
    watch: {
      superuserChecked(newVal) {
        // sets all device permissions to true
        // does not set them all to false if unchecked
        if (newVal) {
          this.devicePermissionsChecked = true;
        }
      }
    },
    beforeMount() {
      this.superuserChecked = this.permissions.is_superuser || false;
      // currently only one device permission
      this.devicePermissionsChecked = this.permissions.can_manage_content || false;
    },
    methods: {
      save() {
        this.uiBlocked = true;
        this.saveProgress = 'IN_PROGRESS';
        this.addOrUpdateUserPermissions({
          is_superuser: this.superuserChecked,
          can_manage_content: this.devicePermissionsChecked,
        })
        .then(function onSuccess() {
          this.saveProgress = 'SUCCESS';
          this.goBack();
        }.bind(this))
        .catch(function onFailure() {
          this.uiBlocked = false;
          this.saveProgress = 'FAILURE';
        }.bind(this));
      },
      goBack() {
        this.$router.push({
          path: '/permissions',
        });
      }
    },
    vuex: {
      getters: {
        user: ({ pageState }) => pageState.user,
        permissions: ({ pageState }) => pageState.permissions,
        isCurrentUser: ({ core, pageState }) => core.session.username === pageState.user.username,
      },
      actions: {
        addOrUpdateUserPermissions,
      },
    },
    $trs: {
      makeSuperuser: 'Make Superuser',
      makeSuperuserDetails: 'A superuser has all device permissions and is able to manage permissions of other users',
      devicePermissions: 'Device Permissions',
      devicePermissionsDetails: 'Can import and export content channels',
      saveButton: 'Save Changes',
      cancelButton: 'Cancel',
      saveInProgressNotification: 'Saving...',
      saveSuccessfulNotification: 'Changes saved!',
      saveFailureNotification: 'There was a problem saving these changes.'
    }
  };

</script>


<style lang="stylus" scoped>

  @require '../../../management-styles.styl'

  .no-margin
    margin-left: 0

</style>

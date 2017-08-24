<template>

  <immersive-full-screen
    :backPageLink="{ name: 'DEVICE_PERMISSIONS_MGMT_PAGE' }"
    :backPageText="backPageText"
    bodyColorHex="#F9F9F9"
    topBarColorHex="#724870"
  >
    <auth-message
      v-if="!isSuperuser"
      authorizedRole="superuser"
    />

    <subpage-container v-else-if="user===null" withSideMargin>
      <h1>{{ $tr('userDoesNotExist') }}</h1>
    </subpage-container>

    <subpage-container v-else withSideMargin>
      <div>
        <h1>{{ user.full_name }}</h1>
        <h3>{{ user.username }}</h3>
      </div>

      <div class="section">
        <k-checkbox
          :disabled="superuserDisabled"
          :label="$tr('makeSuperuser')"
          :checked="superuserChecked"
          @change="superuserChecked=$event"
        />
        <p>{{ $tr('makeSuperuserDetails') }}</p>
      </div>

      <hr />

      <div class="section">
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
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import { addOrUpdateUserPermissions } from '../../state/actions/permissionsActions';

  export default {
    name: 'userPermissionsPage',
    components: {
      authMessage,
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
        return this.uiBlocked || this.isCurrentUser || this.permissionsAreUnchanged;
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
      },
      backPageText() {
        if (!this.isSuperuser) return this.$tr('goBack');
        return this.user ? this.user.full_name : this.$tr('invalidUser');
      },
      // "dirty check" of permissions
      permissionsAreUnchanged() {
        return (
          this.permissions.is_superuser === this.superuserChecked &&
          this.permissions.can_manage_content === this.devicePermissionsChecked
        );
      }
    },
    watch: {
      superuserChecked(newVal) {
        // when superuser is checked, sets all device permissions to true
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
        isSuperuser,
      },
      actions: {
        addOrUpdateUserPermissions,
      },
    },
    $trs: {
      cancelButton: 'Cancel',
      devicePermissions: 'Device Permissions',
      devicePermissionsDetails: 'Can import and export content channels',
      goBack: 'Go Back',
      invalidUser: 'Invalid User ID',
      makeSuperuser: 'Make superuser',
      makeSuperuserDetails: 'A superuser has all device permissions and is able to manage permissions of other users',
      saveButton: 'Save Changes',
      saveFailureNotification: 'There was a problem saving these changes.',
      saveInProgressNotification: 'Saving...',
      saveSuccessfulNotification: 'Changes saved!',
      userDoesNotExist: 'User does not exist',
    }
  };

</script>


<style lang="stylus" scoped>

  .no-margin
    margin-left: 0

  .section
    padding: 1em 0

</style>

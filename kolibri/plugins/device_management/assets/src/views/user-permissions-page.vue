<template>

  <immersive-full-screen v-bind="{ backPageLink, backPageText }">
    <auth-message v-if="!isSuperuser" authorizedRole="superuser" />

    <subpage-container v-else-if="user===null" withSideMargin>
      <h1>{{ $tr('userDoesNotExist') }}</h1>
    </subpage-container>

    <subpage-container v-else withSideMargin>
      <div class="section">
        <h1>
          {{ user.full_name }}
          <span v-if="isCurrentUser">
            ({{ $tr('you') }})
          </span>
        </h1>
        <h3>{{ user.username }}</h3>
      </div>

      <div class="section">
        <k-checkbox
          :disabled="superuserDisabled"
          :label="$tr('makeSuperuser')"
          :checked="superuserChecked"
          @change="superuserChecked=$event"
        />
        <p>
          <permissions-icon permissionType="SUPERUSER" class="permissions-icon" />
          {{ $tr('makeSuperuserDetails') }}
        </p>
      </div>

      <hr>

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
          appearance="raised-button"
          @click="save()"
        />
        <k-button
          :disabled="uiBlocked"
          :text="$tr('cancelButton')"
          :primary="false"
          appearance="flat-button"
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

  import { mapState, mapGetters, mapActions } from 'vuex';
  import ImmersiveFullScreen from 'kolibri.coreVue.components.ImmersiveFullScreen';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import { PageNames } from '../constants';
  import subpageContainer from './containers/subpage-container';

  const SUCCESS = 'SUCCESS';
  const IN_PROGRESS = 'IN_PROGRESS';
  const FAILURE = 'FAILURE';

  export default {
    name: 'UserPermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', { name: this.userFullName }),
      };
    },
    components: {
      AuthMessage,
      ImmersiveFullScreen,
      KButton,
      KCheckbox,
      subpageContainer,
      PermissionsIcon,
    },
    data() {
      return {
        devicePermissionsChecked: undefined,
        saveProgress: undefined,
        superuserChecked: undefined,
        uiBlocked: false,
      };
    },
    computed: {
      ...mapGetters(['isSuperuser']),
      ...mapState({
        user: ({ pageState }) => pageState.user,
        userFullName: state => state.pageState.user.full_name,
        permissions: ({ pageState }) => pageState.permissions,
        isCurrentUser: ({ core, pageState }) => core.session.username === pageState.user.username,
      }),
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
          case IN_PROGRESS:
            return this.$tr('saveInProgressNotification');
          case SUCCESS:
            return this.$tr('saveSuccessfulNotification');
          default:
            return '';
        }
      },
      backPageLink() {
        if (this.isSuperuser) {
          return { name: PageNames.MANAGE_PERMISSIONS_PAGE };
        }
        return { name: PageNames.MANAGE_CONTENT_PAGE };
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
      },
    },
    watch: {
      superuserChecked(newVal, oldVal) {
        // when superuser is checked, sets all device permissions to true
        // does not set them all to false if unchecked
        if (oldVal !== undefined) {
          this.devicePermissionsChecked = newVal;
        }
      },
    },
    beforeMount() {
      this.superuserChecked = this.permissions.is_superuser;
      // ORed with is_superuser since first admin user has `can_manage_content` set to false.
      this.devicePermissionsChecked =
        this.permissions.can_manage_content || this.permissions.is_superuser;
    },
    methods: {
      ...mapActions(['addOrUpdateUserPermissions']),
      save() {
        this.uiBlocked = true;
        this.saveProgress = IN_PROGRESS;
        this.addOrUpdateUserPermissions({
          is_superuser: this.superuserChecked,
          can_manage_content: this.devicePermissionsChecked,
        })
          .then(() => {
            this.saveProgress = SUCCESS;
            this.goBack();
          })
          .catch(() => {
            this.uiBlocked = false;
            this.saveProgress = FAILURE;
          });
      },
      goBack() {
        this.$router.push({ path: '/permissions' });
      },
    },
    $trs: {
      cancelButton: 'Cancel',
      devicePermissions: 'Device permissions',
      devicePermissionsDetails: 'Can import and export content channels',
      goBack: 'Go Back',
      invalidUser: 'Invalid user ID',
      makeSuperuser: 'Make superuser',
      makeSuperuserDetails:
        'A superuser has all device permissions and is able to manage permissions of other users',
      saveButton: 'Save Changes',
      saveFailureNotification: 'There was a problem saving these changes.',
      saveInProgressNotification: 'Saving...',
      saveSuccessfulNotification: 'Changes saved!',
      userDoesNotExist: 'User does not exist',
      you: 'You',
      documentTitle: "{ name }'s Device Permissions",
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .no-margin {
    margin-left: 0;
  }

  .section {
    padding: 1em;
  }

  .permissions-icon {
    padding-right: 8px;
  }

</style>

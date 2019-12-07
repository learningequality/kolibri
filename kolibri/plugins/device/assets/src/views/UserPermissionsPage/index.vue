<template>

  <div>
    <h1 v-if="user === null">
      {{ $tr('userDoesNotExist') }}
    </h1>

    <template v-else>
      <div class="section user-info">
        <h1 dir="auto">
          <KLabeledIcon icon="person" :label="isCurrentUser ? $tr('you') : user.full_name" />
        </h1>

        <table>
          <tr>
            <th scope="row">
              {{ coreString('usernameLabel') }}
            </th>
            <td>{{ user.username }}</td>
          </tr>

          <tr>
            <th scope="row">
              {{ coreString('userTypeLabel') }}
            </th>
            <td>
              <UserTypeDisplay :userType="UserType(user)" />
            </td>
          </tr>

          <tr>
            <th scope="row">
              {{ coreString('facilityLabel') }}
            </th>
            <td dir="auto">
              {{ facilityName }}
            </td>
          </tr>
        </table>

      </div>

      <div class="section superuser">
        <KCheckbox
          class="super-admin-checkbox"
          :disabled="superuserDisabled"
          :label="$tr('makeSuperAdmin')"
          :checked="superuserChecked"
          @change="superuserChecked=$event"
        />
        <PermissionsIcon permissionType="SUPERUSER" class="permissions-icon" />

        <ul
          class="checkbox-description"
          :style="{
            color: superuserDisabled ? $themeTokens.textDisabled : $themeTokens.annotation
          }"
        >
          <li>{{ $tr('superAdminExplanation1') }}</li>
          <li>{{ $tr('superAdminExplanation2') }}</li>
        </ul>
      </div>

      <div class="section">
        <h2>{{ coreString('devicePermissionsLabel') }}</h2>
        <KCheckbox
          :disabled="devicePermissionsDisabled"
          :label="$tr('devicePermissionsDetails')"
          :checked="devicePermissionsChecked"
          @change="devicePermissionsChecked=$event"
        />
      </div>

      <div class="buttons">
        <KButton
          :disabled="saveDisabled"
          :text="$tr('saveButton')"
          class="no-margin"
          :primary="true"
          appearance="raised-button"
          @click="save()"
        />
        <KButton
          :disabled="uiBlocked"
          :text="coreString('cancelAction')"
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
    </template>

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UserType from 'kolibri.utils.UserType';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';

  const SUCCESS = 'SUCCESS';
  const IN_PROGRESS = 'IN_PROGRESS';
  const FAILURE = 'FAILURE';

  export default {
    name: 'UserPermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', { name: this.user.full_name }),
      };
    },
    components: {
      PermissionsIcon,
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        devicePermissionsChecked: undefined,
        saveProgress: undefined,
        superuserChecked: undefined,
        uiBlocked: false,
      };
    },
    computed: {
      ...mapGetters(['facilities']),
      ...mapState('userPermissions', ['user', 'permissions']),
      ...mapState({
        currentUsername: state => state.core.session.username,
      }),
      // IDEA Make this a core getter? Need audit
      facilityName() {
        return this.facilities.find(facility => facility.id === this.user.facility).name;
      },
      isCurrentUser() {
        return this.currentUsername === this.user.username;
      },
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
      ...mapActions('userPermissions', ['addOrUpdateUserPermissions']),
      ...mapActions(['createSnackbar']),
      save() {
        this.uiBlocked = true;
        this.saveProgress = IN_PROGRESS;
        this.addOrUpdateUserPermissions({
          userId: this.user.id,
          is_superuser: this.superuserChecked,
          can_manage_content: this.devicePermissionsChecked,
        })
          .then(() => {
            this.createSnackbar(this.$tr('permissionChangeConfirmation'));
            this.saveProgress = SUCCESS;
            this.uiBlocked = false;
          })
          .catch(() => {
            this.uiBlocked = false;
            this.saveProgress = FAILURE;
          });
      },
      goBack() {
        this.$router.push({ name: 'MANAGE_PERMISSIONS_PAGE' });
      },
      UserType,
    },
    $trs: {
      devicePermissionsDetails: {
        message: 'Can manage resources on this device',
        context:
          '\nLabel for the checkbox to confirm granting a user permissions to manage content on the device.',
      },
      documentTitle: "{ name }'s Device Permissions",
      makeSuperAdmin: 'Make super admin',
      permissionChangeConfirmation: 'Changes saved',
      saveButton: 'Save Changes',
      saveFailureNotification: 'There was a problem saving these changes.',
      saveInProgressNotification: 'Saving...',
      saveSuccessfulNotification: 'Changes saved!',
      userDoesNotExist: 'User does not exist',
      superAdminExplanation1:
        'Has all device permissions and can manage device permissions of other users',
      superAdminExplanation2: 'Has admin permissions for all facilities on this device',
      you: 'You',
    },
  };

</script>


<style lang="scss" scoped>

  .no-margin {
    margin-left: 0;
  }

  table {
    line-height: 1.5em;
    text-align: left;
    table-layout: fixed;
  }
  th {
    min-width: 112px;
  }

  .super-admin-checkbox {
    display: inline-table;
  }

  .checkbox-description {
    // visual estimate, supposed to line up with checkbox label
    padding: 0;
    margin: 0 0 0 50px;
    font-size: 12px;
  }

  .section {
    margin-bottom: 16px;
  }

  .permissions-icon {
    display: inline;
    margin-left: 8px;
  }

</style>

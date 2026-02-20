<template>

  <ImmersivePage
    :appBarTitle="$tr('permissionsTitle')"
    :route="backRoute"
    :loading="isPageLoading"
  >
    <KPageContainer
      v-if="!isPageLoading"
      class="device-container"
    >
      <h1 v-if="user === null">
        {{ $tr('userDoesNotExist') }}
      </h1>

      <template v-else>
        <div class="section user-info">
          <h1 dir="auto">
            <KLabeledIcon
              icon="person"
              :label="isCurrentUser ? $tr('you') : user.full_name"
            />
          </h1>

          <table>
            <tr>
              <th>
                {{ coreString('usernameLabel') }}
              </th>
              <td>{{ user.username }}</td>
            </tr>

            <tr>
              <th>
                {{ coreString('userTypeLabel') }}
              </th>
              <td>
                <UserTypeDisplay :userType="UserType(user)" />
              </td>
            </tr>

            <tr>
              <th>
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
            :checked="superuserChecked"
            @change="superuserChecked = $event"
          >
            <span :style="superuserLabelStyle">{{ $tr('makeSuperAdmin') }}</span>
            <PermissionsIcon
              permissionType="SUPERUSER"
              class="permissions-icon"
              :lightIcon="superuserDisabled"
            />
          </KCheckbox>

          <ul
            class="checkbox-description"
            :style="{
              color: superuserDisabled ? $themeTokens.textDisabled : $themeTokens.annotation,
            }"
          >
            <li>{{ $tr('superAdminExplanation1') }}</li>
            <li>{{ $tr('superAdminExplanation2', { facilityName }) }}</li>
          </ul>
        </div>

        <div class="section">
          <h2>{{ coreString('devicePermissionsLabel') }}</h2>
          <KCheckbox
            :disabled="devicePermissionsDisabled"
            :label="$tr('devicePermissionsDetails')"
            :checked="devicePermissionsChecked"
            @change="devicePermissionsChecked = $event"
          />
        </div>

        <div class="buttons">
          <KButtonGroup>
            <KButton
              :disabled="saveDisabled"
              :text="$tr('saveButton')"
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
          </KButtonGroup>
        </div>
        <div v-if="saveFailed">
          {{ $tr('saveFailureNotification') }}
        </div>
      </template>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UserType from 'kolibri-common/utils/userType';
  import PermissionsIcon from 'kolibri-common/components/labels/PermissionsIcon';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import useUser from 'kolibri/composables/useUser';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { PageNames } from '../../constants';

  export default {
    name: 'UserPermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle', { name: this.user.full_name }),
      };
    },
    components: {
      ImmersivePage,
      PermissionsIcon,
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { currentUserId } = useUser();
      const { facilities } = useFacilities();
      return { currentUserId, facilities };
    },
    data() {
      return {
        devicePermissionsChecked: undefined,
        saveFailed: false,
        superuserChecked: undefined,
        uiBlocked: false,
      };
    },
    computed: {
      ...mapGetters(['isPageLoading']),
      ...mapState('userPermissions', ['user', 'permissions']),
      backRoute() {
        return { name: PageNames.MANAGE_PERMISSIONS_PAGE };
      },
      // IDEA Make this a core getter? Need audit
      facilityName() {
        return this.facilities.find(facility => facility.id === this.user.facility).name;
      },
      isCurrentUser() {
        return this.currentUserId === this.user.id;
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
      // "dirty check" of permissions
      permissionsAreUnchanged() {
        return (
          this.permissions.is_superuser === this.superuserChecked &&
          this.permissions.can_manage_content === this.devicePermissionsChecked
        );
      },
      superuserLabelStyle() {
        return { color: this.superuserDisabled ? this.$themeTokens.textDisabled : '' };
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
      user() {
        /* user will be set asynchronously and when it is, we need to intiialize these */
        this.superuserChecked = this.permissions.is_superuser;
        this.devicePermissionsChecked =
          this.permissions.can_manage_content || this.permissions.is_superuser;
      },
    },
    methods: {
      ...mapActions('userPermissions', ['addOrUpdateUserPermissions']),
      save() {
        this.uiBlocked = true;
        this.addOrUpdateUserPermissions({
          userId: this.user.id,
          is_superuser: this.superuserChecked,
          can_manage_content: this.devicePermissionsChecked,
        })
          .then(() => {
            this.showSnackbarNotification('changesSaved');
            this.uiBlocked = false;
            this.goBack();
          })
          .catch(() => {
            this.uiBlocked = false;
            this.saveFailed = true;
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
          'Label for the checkbox to confirm granting a user permissions to manage content on the device.',
      },
      documentTitle: {
        message: "{ name }'s Device Permissions",
        context:
          'Page title for the individual user device permissions view. This is not seen in the UI.',
      },
      makeSuperAdmin: {
        message: 'Make super admin',
        context:
          'Label for the checkbox to confirm giving the user super admin permissions on the device.',
      },
      permissionsTitle: {
        message: 'Permissions',
        context:
          'Indicates the Device > Permissions tab. Permissions refer to what users can manage on the device.',
      },
      saveButton: {
        message: 'Save Changes',
        context: 'Button on user permission page.',
      },
      saveFailureNotification: {
        message: 'There was a problem saving these changes.',
        context: 'Error message if changes made on user permissions page are not saved.',
      },
      userDoesNotExist: {
        message: 'User does not exist',
        context: 'Error message.',
      },
      superAdminExplanation1: {
        message: 'Has all device permissions and can manage the device permissions of other users',
        context: 'Description of super admin role.',
      },
      superAdminExplanation2: {
        message:
          "Has admin permissions for all facilities on this device, but is still a member of the facility '{facilityName}'",
        context: 'Description of super admin role.',
      },
      you: {
        message: 'You',
        context: 'Refers to the admin user who is currently logged in to Kolibri.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  table {
    line-height: 1.5em;
    text-align: left;
    table-layout: fixed;
  }

  th {
    min-width: 112px;
    padding-right: 4px;
  }

  td {
    padding-left: 4px;
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

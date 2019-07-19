<template>

  <KPageContainer>

    <KGrid>
      <KGridItem sizes="100, 75, 75" percentage>
        <h1>{{ $tr('detailsHeader') }}</h1>
      </KGridItem>
      <KGridItem sizes="100, 25, 25" percentage alignment="right">
        <KRouterLink
          :text="$tr('editAction')"
          appearance="raised-button"
          :primary="true"
          :to="$router.getRoute('PROFILE_EDIT')"
        />
      </KGridItem>
    </KGrid>

    <table>
      <tr>
        <th>{{ $tr('points') }}</th>
        <td class="points-cell">
          <PointsIcon class="points-icon" />
          <span :style="{ color: $themeTokens.correct }">
            {{ $formatNumber(totalPoints) }}
          </span>
        </td>
      </tr>

      <tr>
        <th>{{ $tr('userType') }}</th>

        <td>
          <UserTypeDisplay
            :distinguishCoachTypes="false"
            :userType="getUserKind"
          />
        </td>
      </tr>

      <tr v-if="facilityName">
        <th>{{ $tr('facility') }}</th>
        <td>{{ facilityName }}</td>
      </tr>

      <tr v-if="userHasPermissions">
        <th style="vertical-align: top">
          {{ $tr('devicePermissions') }}
        </th>
        <td>
          <KLabeledIcon>
            <PermissionsIcon
              slot="icon"
              :permissionType="permissionType"
              class="permissions-icon"
            />
            {{ permissionTypeText }}
          </KLabeledIcon>
          <p>
            {{ $tr('youCan') }}
            <ul class="permissions-list">
              <li v-if="isSuperuser">
                {{ $tr('manageDevicePermissions') }}
              </li>
              <li v-for="(value, key) in userPermissions" :key="key">
                {{ getPermissionString(key) }}
              </li>
            </ul>
          </p>
        </td>
      </tr>

      <tr>
        <th>{{ $tr('name') }}</th>
        <td>{{ session.full_name }}</td>
      </tr>

      <tr>
        <th>{{ $tr('username') }}</th>
        <td>{{ session.username }}</td>
      </tr>

      <tr>
        <th>{{ UserAccountsStrings.$tr('genderLabel') }}</th>
        <td>Gender</td>
      </tr>

      <tr>
        <th>{{ UserAccountsStrings.$tr('birthYearLabel') }}</th>
        <td>Birth year</td>
      </tr>

      <tr v-if="canEditPassword">
        <th>{{ $tr('changePasswordHeader') }}</th>
        <td>
          <KButton
            appearance="basic-link"
            :text="$tr('changePasswordPrompt')"
            :disabled="busy"
            class="change-password"
            @click="setPasswordModalVisible(true)"
          />
        </td>
      </tr>
    </table>

    <ChangeUserPasswordModal
      v-if="passwordModalVisible"
      @cancel="setPasswordModalVisible(false)"
    />
  </KPageContainer>

</template>


<script>

  import { mapState, mapGetters, mapMutations } from 'vuex';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import UserAccountsStrings from 'kolibri.strings.userAccounts';
  import ChangeUserPasswordModal from './ChangeUserPasswordModal';

  export default {
    name: 'ProfilePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      KButton,
      KGrid,
      KGridItem,
      KLabeledIcon,
      KPageContainer,
      KRouterLink,
      PointsIcon,
      PermissionsIcon,
      ChangeUserPasswordModal,
      UserTypeDisplay,
    },
    mixins: [responsiveWindow, themeMixin],
    computed: {
      UserAccountsStrings() {
        return UserAccountsStrings;
      },
      ...mapGetters([
        'facilityConfig',
        'getUserKind',
        'getUserPermissions',
        'isSuperuser',
        'totalPoints',
        'userHasPermissions',
      ]),
      ...mapState({
        session: state => state.core.session,
      }),
      ...mapState('profile', ['busy', 'passwordState']),
      userPermissions() {
        return pickBy(this.getUserPermissions);
      },
      facilityName() {
        const match = find(this.$store.getters.facilities, {
          id: this.$store.getters.currentFacilityId,
        });
        return match ? match.name : '';
      },
      passwordModalVisible() {
        return this.passwordState.modal;
      },
      permissionType() {
        if (this.isSuperuser) {
          return PermissionTypes.SUPERUSER;
        } else if (this.userHasPermissions) {
          return PermissionTypes.LIMITED_PERMISSIONS;
        }
        return null;
      },
      permissionTypeText() {
        if (this.isSuperuser) {
          return this.$tr('isSuperuser');
        } else if (this.userHasPermissions) {
          return this.$tr('limitedPermissions');
        }
        return '';
      },
      canEditPassword() {
        return this.isSuperuser || this.facilityConfig.learner_can_edit_password;
      },
    },
    created() {
      this.$store.dispatch('fetchPoints');
    },
    methods: {
      ...mapMutations('profile', {
        setPasswordModalVisible: 'SET_PROFILE_PASSWORD_MODAL',
      }),
      getPermissionString(permission) {
        if (permission === 'can_manage_content') {
          return this.$tr('manageContent');
        }
        return permission;
      },
    },
    $trs: {
      success: 'Profile details updated',
      username: 'Username',
      name: 'Full name',
      isSuperuser: 'Super admin permissions ',
      manageContent: 'Manage content',
      manageDevicePermissions: 'Manage device permissions',
      points: 'Points',
      userType: 'User type',
      devicePermissions: 'Device permissions',
      limitedPermissions: 'Limited permissions',
      youCan: 'You can:',
      changePasswordPrompt: 'Change password',
      documentTitle: 'User Profile',
      facility: 'Facility',
      detailsHeader: 'Details',
      editAction: 'Edit',
      changePasswordHeader: 'Password',
    },
  };

</script>


<style lang="scss" scoped>

  .points-icon,
  .points-num {
    display: inline-block;
  }

  th {
    text-align: left;
  }

  th,
  td {
    height: 2em;
    padding-top: 24px;
    padding-right: 24px;
  }

  .points-icon {
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }

  .points-num {
    margin-left: 16px;
    font-size: 3em;
    font-weight: bold;
  }

  section {
    margin-bottom: 36px;
  }

  .permissions-list {
    padding-left: 37px;
  }

  .permissions-icon {
    padding-right: 8px;
  }

  .submit {
    margin-left: 0;
  }

  .change-password {
    margin-top: 8px;
  }

  .points-cell {
    vertical-align: middle;
  }

</style>

<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coreString('profileLabel')"
    :immersivePagePrimary="true"
  >
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
            :to="profileEditRoute"
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
          <th>{{ coreString('userTypeLabel') }}</th>

          <td>
            <UserTypeDisplay
              :distinguishCoachTypes="false"
              :userType="getUserKind"
            />
          </td>
        </tr>

        <tr v-if="facilityName">
          <th>{{ coreString('facilityLabel') }}</th>
          <td>{{ facilityName }}</td>
        </tr>

        <tr v-if="userHasPermissions">
          <th style="vertical-align: top">
            {{ coreString('devicePermissionsLabel') }}
          </th>
          <td>
            <KLabeledIcon>
              <template #icon>
                <PermissionsIcon
                  :permissionType="permissionType"
                  class="permissions-icon"
                />
              </template>
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
          <th>{{ coreString('fullNameLabel') }}</th>
          <td>{{ session.full_name }}</td>
        </tr>

        <tr>
          <th>{{ coreString('usernameLabel') }}</th>
          <td>{{ session.username }}</td>
        </tr>

        <tr>
          <th>{{ coreString('genderLabel') }}</th>
          <td>
            <GenderDisplayText :gender="currentUser.gender" />
          </td>
        </tr>

        <tr>
          <th>{{ coreString('birthYearLabel') }}</th>
          <td>
            <BirthYearDisplayText :birthYear="currentUser.birth_year" />
          </td>
        </tr>

        <tr v-if="canEditPassword">
          <th>{{ coreString('passwordLabel') }}</th>
          <td>
            <KButton
              appearance="basic-link"
              :text="$tr('changePasswordPrompt')"
              class="change-password"
              @click="showPasswordModal = true"
            />
          </td>
        </tr>
      </table>

      <ChangeUserPasswordModal
        v-if="showPasswordModal"
        @cancel="showPasswordModal = false"
      />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { mapState, mapGetters } from 'vuex';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';
  import GenderDisplayText from 'kolibri.coreVue.components.GenderDisplayText';
  import BirthYearDisplayText from 'kolibri.coreVue.components.BirthYearDisplayText';
  import { ComponentMap } from '../../constants';
  import ChangeUserPasswordModal from './ChangeUserPasswordModal';
  import useCurrentUser from './useCurrentUser';

  export default {
    name: 'ProfilePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      BirthYearDisplayText,
      ChangeUserPasswordModal,
      CoreBase,
      GenderDisplayText,
      PermissionsIcon,
      PointsIcon,
      UserTypeDisplay,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    setup() {
      const showPasswordModal = ref(false);
      const { currentUser } = useCurrentUser();
      return {
        currentUser,
        showPasswordModal,
      };
    },
    computed: {
      ...mapGetters([
        'facilityConfig',
        'getUserKind',
        'getUserPermissions',
        'isCoach',
        'isSuperuser',
        'totalPoints',
        'userHasPermissions',
      ]),
      ...mapState({
        session: state => state.core.session,
      }),
      profileEditRoute() {
        return this.$router.getRoute(ComponentMap.PROFILE_EDIT);
      },
      userPermissions() {
        return pickBy(this.getUserPermissions);
      },
      facilityName() {
        const match = find(this.$store.getters.facilities, {
          id: this.$store.getters.currentFacilityId,
        });
        return match ? match.name : '';
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
        const learner_can_edit =
          this.facilityConfig.learner_can_edit_password &&
          !this.facilityConfig.learner_can_login_with_no_password;
        return this.isSuperuser || this.isCoach || learner_can_edit;
      },
    },
    created() {
      this.$store.dispatch('fetchPoints');
    },
    methods: {
      getPermissionString(permission) {
        if (permission === 'can_manage_content') {
          return this.$tr('manageContent');
        }
        return permission;
      },
    },
    $trs: {
      detailsHeader: {
        message: 'Details',
        context:
          'Title for the page which indicates further information about the user such as the number of points they have, or their user type, for example.',
      },
      editAction: {
        message: 'Edit',
        context: 'Button which allows the user to modify some information on their profile.',
      },
      isSuperuser: {
        message: 'Super admin permissions ',
        context:
          'A super admin is an account type that can manage the device. Super admin accounts also have permission to do everything that admins, coaches, and learners can do.',
      },
      manageContent: {
        message: 'Manage content',
        context: 'A type of device permission.',
      },
      manageDevicePermissions: {
        message: 'Manage device permissions',
        context: 'A type of device permission.',
      },
      points: {
        message: 'Points',
        context:
          'Points are an abstract reward given to learners as they make progress through resources.',
      },
      limitedPermissions: {
        message: 'Limited permissions',
        context: 'A type of device permission.',
      },
      youCan: {
        message: 'You can:',
        context: 'Descriptive text on user profile page. Indicates the permissions a user has.',
      },
      changePasswordPrompt: {
        message: 'Change password',
        context:
          'Users have the option to change their password if, for example, they have forgotten it.\n\nThis is the text that appears on the change password prompt.',
      },
      documentTitle: {
        message: 'User Profile',
        context: 'Title of the user profile page.',
      },
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

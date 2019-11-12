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
          <GenderDisplayText :gender="facilityUser.gender" />
        </td>
      </tr>

      <tr>
        <th>{{ coreString('birthYearLabel') }}</th>
        <td>
          <BirthYearDisplayText :birthYear="facilityUser.birth_year" />
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

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';
  import { FacilityUserResource } from 'kolibri.resources';
  import GenderDisplayText from 'kolibri.coreVue.components.GenderDisplayText';
  import BirthYearDisplayText from 'kolibri.coreVue.components.BirthYearDisplayText';
  import ChangeUserPasswordModal from './ChangeUserPasswordModal';

  export default {
    name: 'ProfilePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      PointsIcon,
      PermissionsIcon,
      ChangeUserPasswordModal,
      UserTypeDisplay,
      GenderDisplayText,
      BirthYearDisplayText,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    data() {
      return {
        facilityUser: {},
        showPasswordModal: false,
      };
    },
    computed: {
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
        return this.isSuperuser || this.facilityConfig.learner_can_edit_password;
      },
    },
    created() {
      this.$store.dispatch('fetchPoints');
    },
    mounted() {
      this.fetchFacilityUser();
    },
    methods: {
      getPermissionString(permission) {
        if (permission === 'can_manage_content') {
          return this.$tr('manageContent');
        }
        return permission;
      },
      fetchFacilityUser() {
        FacilityUserResource.fetchModel({ id: this.session.user_id }).then(facilityUser => {
          this.facilityUser = { ...facilityUser };
        });
      },
    },
    $trs: {
      detailsHeader: 'Details',
      editAction: 'Edit',
      isSuperuser: 'Super admin permissions ',
      manageContent: 'Manage content',
      manageDevicePermissions: 'Manage device permissions',
      points: 'Points',
      limitedPermissions: 'Limited permissions',
      youCan: 'You can:',
      changePasswordPrompt: 'Change password',
      documentTitle: 'User Profile',
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

<template>

  <NotificationsRoot>
    <AppBarPage :title="coreString('profileLabel')">
      <KPageContainer>
        <KGrid>
          <KGridItem
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >
            <h1>{{ coreString('profileLabel') }}</h1>
          </KGridItem>
          <KGridItem
            v-if="!isLearnerOnlyImport"
            :layout8="{ span: 4, alignment: 'right' }"
            :layout12="{ span: 6, alignment: 'right' }"
          >
            <h1>
              <KRouterLink
                :text="coreString('editAction')"
                appearance="raised-button"
                :primary="true"
                :to="profileEditRoute"
              />
            </h1>
          </KGridItem>
        </KGrid>

        <table>
          <tr>
            <th>{{ $tr('points') }}</th>
            <td class="points-cell">
              <KIcon
                icon="pointsActive"
                :color="$themeTokens.primary"
              />
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
              <p>{{ $tr('youCan') }}</p>
              <ul class="permissions-list">
                <li v-if="isSuperuser">
                  {{ $tr('manageDevicePermissions') }}
                </li>
                <li
                  v-for="(value, key) in userPermissions"
                  :key="key"
                >
                  {{ getPermissionString(key) }}
                </li>
              </ul>
            </td>
          </tr>

          <tr>
            <th>{{ coreString('fullNameLabel') }}</th>
            <td>{{ currentUser.full_name }}</td>
          </tr>

          <tr>
            <th>{{ coreString('usernameLabel') }}</th>
            <td>{{ currentUser.username }}</td>
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

          <tr v-if="!isLearnerOnlyImport && canEditPassword">
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

        <KGrid
          v-if="onMyOwnSetup"
          :style="{
            marginTop: '34px',
            paddingTop: '10px',
            borderTop: `1px solid ${$themeTokens.fineLine}`,
          }"
        >
          <KGridItem
            :layout8="{ span: 4 }"
            :layout12="{ span: 6 }"
          >
            <h2>{{ coreString('changeLearningFacility') }}</h2>
          </KGridItem>
          <KGridItem
            :layout8="{ span: 4, alignment: 'right' }"
            :layout12="{ span: 6, alignment: 'right' }"
          >
            <h2>
              <KRouterLink
                :text="$tr('changeAction')"
                appearance="raised-button"
                :primary="false"
                :to="$router.getRoute('CHANGE_FACILITY')"
              />
            </h2>
          </KGridItem>
          <KGridItem>
            <span>{{ $tr('changeLearningFacilityDescription') }}</span>
            <span><KButton
              appearance="basic-link"
              :text="$tr('learnMore')"
              class="learn"
              @click="showLearnModal = true"
            /></span>
          </KGridItem>
        </KGrid>

        <ChangeUserPasswordModal
          v-if="!isLearnerOnlyImport && showPasswordModal"
          @cancel="showPasswordModal = false"
        />

        <KModal
          v-if="showLearnModal"
          :title="coreString('changeLearningFacility')"
          size="medium"
          :cancelText="coreString('closeAction')"
          @cancel="showLearnModal = false"
        >
          <p>{{ $tr('learnModalLine1') }}</p>
          <p>{{ $tr('learnModalLine2') }}</p>
        </KModal>
      </KPageContainer>
    </AppBarPage>
  </NotificationsRoot>

</template>


<script>

  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import AppBarPage from 'kolibri/components/pages/AppBarPage';
  import { mapGetters } from 'vuex';
  import { ref } from 'vue';
  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import PermissionsIcon from 'kolibri-common/components/labels/PermissionsIcon';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import { PermissionTypes } from 'kolibri/constants';
  import useUser from 'kolibri/composables/useUser';
  import GenderDisplayText from 'kolibri-common/components/userAccounts/GenderDisplayText';
  import BirthYearDisplayText from 'kolibri-common/components/userAccounts/BirthYearDisplayText';
  import useTotalProgress from 'kolibri/composables/useTotalProgress';
  import { RoutesMap } from '../../constants';
  import useCurrentUser from '../../composables/useCurrentUser';
  import useOnMyOwnSetup from '../../composables/useOnMyOwnSetup';
  import ChangeUserPasswordModal from './ChangeUserPasswordModal';

  export default {
    name: 'ProfilePage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AppBarPage,
      BirthYearDisplayText,
      ChangeUserPasswordModal,
      NotificationsRoot,
      GenderDisplayText,
      PermissionsIcon,
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
    setup() {
      const showPasswordModal = ref(false);
      const showLearnModal = ref(false);
      const { currentUser } = useCurrentUser();
      const {
        isLearnerOnlyImport,
        getUserKind,
        getUserPermissions,
        isCoach,
        isSuperuser,
        userHasPermissions,
        userFacilityId,
      } = useUser();
      const { onMyOwnSetup } = useOnMyOwnSetup();
      const { fetchPoints, totalPoints } = useTotalProgress();
      return {
        currentUser,
        onMyOwnSetup,
        isLearnerOnlyImport,
        getUserKind,
        getUserPermissions,
        isCoach,
        isSuperuser,
        userHasPermissions,
        userFacilityId,
        showLearnModal,
        showPasswordModal,
        fetchPoints,
        totalPoints,
      };
    },
    computed: {
      ...mapGetters(['facilityConfig']),
      profileEditRoute() {
        return this.$router.getRoute(RoutesMap.PROFILE_EDIT);
      },
      userPermissions() {
        return pickBy(this.getUserPermissions);
      },
      facilityName() {
        const match = find(this.$store.getters.facilities, {
          id: this.userFacilityId,
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
      this.fetchPoints();
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
      changeAction: {
        message: 'Change',
        context: 'Button which allows the user to change to a different facility.',
      },
      changeLearningFacilityDescription: {
        message: 'Move your account and progress data to another learning facility.',
        context: 'Explanation of what change a learning facility means',
      },
      learnMore: {
        message: 'Learn more',
        context:
          'Link to open a modal window explaining what changing to another learning facility represents.',
      },
      isSuperuser: {
        message: 'Super admin permissions ',
        context:
          'A super admin is an account type that can manage the device. Super admin accounts also have permission to do everything that admins, coaches, and learners can do.',
      },
      manageContent: {
        message: 'Manage channels and resources',
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
        context:
          'A type of device permission that indicates that the user has permissions to manage content, but not other users or facility settings.',
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
      learnModalLine1: {
        message:
          'Learning facility represents the location where you are using Kolibri, such as a school, training center, or a home.',
        context:
          'First line of text in the modal explaining what changing to another learning facility means.',
      },
      learnModalLine2: {
        message:
          'Moving your account to another learning facility means administrators of that facility will be able to access your data.',
        context:
          'Second line of text in the modal explaining what changing to another learning facility means.',
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

  .learn {
    margin-left: 8px;
  }

  .points-cell {
    vertical-align: middle;
  }

</style>

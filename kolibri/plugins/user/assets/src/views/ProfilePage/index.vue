<template>

  <KPageContainer class="content">

    <section>
      <h2>{{ $tr('points') }}</h2>
      <PointsIcon class="points-icon" />
      <span class="points-num" :style="{ color: $themeTokens.correct }">
        {{ $formatNumber(totalPoints) }}
      </span>
    </section>

    <section>
      <h2>{{ $tr('userType') }}</h2>
      <UserTypeDisplay :distinguishCoachTypes="false" :userType="getUserKind" />
    </section>

    <section v-if="facilityName">
      <h2>{{ facilityString }}</h2>
      <p>{{ facilityName }}</p>
    </section>


    <section v-if="userHasPermissions">
      <h2>{{ $tr('devicePermissions') }}</h2>
      <p>
        <KLabeledIcon>
          <PermissionsIcon slot="icon" :permissionType="permissionType" class="permissions-icon" />
          {{ permissionTypeText }}
        </KLabeledIcon>
      </p>
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
    </section>

    <form @submit.prevent="submitEdits">
      <UiAlert
        v-if="success"
        type="success"
        :dismissible="false"
      >
        {{ $tr('success') }}
      </UiAlert>

      <KTextbox
        v-if="canEditName"
        ref="name"
        v-model="name"
        type="text"
        autocomplete="name"
        :autofocus="false"
        :label="$tr('name')"
        :disabled="busy"
        :maxlength="120"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
      />
      <template v-else>
        <h2>{{ $tr('name') }}</h2>
        <p>{{ name }}</p>
      </template>

      <KTextbox
        v-if="canEditUsername"
        ref="username"
        v-model="username"
        type="text"
        autocomplete="username"
        :label="$tr('username')"
        :disabled="busy"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
        @input="resetProfileState"
      />
      <template v-else>
        <h2>{{ $tr('username') }}</h2>
        <p>{{ session.username }}</p>
      </template>

      <KButton
        v-if="canEditUsername || canEditName"
        type="submit"
        class="submit"
        :text="$tr('updateProfile')"
        :primary="true"
        :disabled="busy"
      />

    </form>

    <KButton
      v-if="canEditPassword"
      appearance="basic-link"
      :text="$tr('changePasswordPrompt')"
      :disabled="busy"
      class="change-password"
      @click="setPasswordModalVisible(true)"
    />

    <ChangeUserPasswordModal
      v-if="passwordModalVisible"
      @cancel="setPasswordModalVisible(false)"
    />
  </KPageContainer>

</template>


<script>

  import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import find from 'lodash/find';
  import pickBy from 'lodash/pickBy';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { validateUsername } from 'kolibri.utils.validators';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { PermissionTypes, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import SignUpPage from '../SignUpPage';
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
      KTextbox,
      KLabeledIcon,
      KPageContainer,
      UiAlert,
      PointsIcon,
      PermissionsIcon,
      ChangeUserPasswordModal,
      UserTypeDisplay,
    },
    mixins: [responsiveWindow, themeMixin],
    data() {
      const { username, full_name } = this.$store.state.core.session;
      return {
        username: username,
        name: full_name,
        usernameBlurred: false,
        nameBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      ...mapGetters([
        'facilityConfig',
        'getUserKind',
        'getUserPermissions',
        'isCoach',
        'isLearner',
        'isSuperuser',
        'totalPoints',
        'userHasPermissions',
      ]),
      ...mapState({
        session: state => state.core.session,
      }),
      ...mapState('profile', ['busy', 'passwordState', 'success']),
      ...mapState('profile', {
        profileErrors: 'errors',
      }),
      userPermissions() {
        return pickBy(this.getUserPermissions);
      },
      facilityString() {
        return SignUpPageStrings.$tr('facility');
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
      canEditUsername() {
        if (this.isCoach || this.isLearner) {
          return this.facilityConfig.learner_can_edit_username;
        }
        return true;
      },
      canEditName() {
        if (this.isCoach || this.isLearner) {
          return this.facilityConfig.learner_can_edit_name;
        }
        return true;
      },
      canEditPassword() {
        return this.isSuperuser || this.facilityConfig.learner_can_edit_password;
      },
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username)) {
            return this.$tr('usernameNotAlphaNumUnderscore');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExists');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
      },
      usernameAlreadyExists() {
        return this.profileErrors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS);
      },
      formIsValid() {
        return !this.usernameIsInvalid;
      },
    },
    created() {
      this.fetchPoints();
    },
    methods: {
      ...mapActions(['fetchPoints']),
      ...mapActions('profile', ['updateUserProfile']),
      ...mapMutations('profile', {
        resetProfileState: 'RESET_STATE',
        setPasswordModalVisible: 'SET_PROFILE_PASSWORD_MODAL',
      }),
      submitEdits() {
        this.formSubmitted = true;
        this.resetProfileState();
        if (this.formIsValid) {
          this.updateUserProfile({
            edits: {
              username: this.username,
              full_name: this.name,
            },
            session: this.session,
          });
        } else {
          if (this.nameIsInvalid) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalid) {
            this.$refs.username.focus();
          }
        }
      },
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
      updateProfile: 'Save changes',
      isSuperuser: 'Super admin permissions ',
      manageContent: 'Manage content',
      manageDevicePermissions: 'Manage device permissions',
      points: 'Points',
      userType: 'User type',
      devicePermissions: 'Device permissions',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      required: 'This field is required',
      limitedPermissions: 'Limited permissions',
      youCan: 'You can',
      changePasswordPrompt: 'Change password',
      usernameAlreadyExists: 'An account with that username already exists',
      documentTitle: 'User Profile',
    },
  };

</script>


<style lang="scss" scoped>

  .content {
    max-width: 500px;
    margin-right: auto;
    margin-left: auto;
  }

  .points-icon,
  .points-num {
    display: inline-block;
  }

  .points-icon {
    width: 2em;
    height: 2em;
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

</style>

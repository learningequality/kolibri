<template>

  <div class="content">

    <section>
      <h2>{{ $tr('points') }}</h2>
      <points-icon class="points-icon" :active="true" />
      <span class="points-num">{{ $formatNumber(totalPoints) }}</span>
    </section>

    <section>
      <h2>{{ $tr('role') }}</h2>
      {{ role }}
    </section>

    <section v-if="userHasPermissions">
      <h2>{{ $tr('devicePermissions') }}</h2>
      <p>
        <permissions-icon :permissionType="permissionType" class="permissions-icon" />
        {{ permissionTypeText }}
      </p>
      <p>
        {{ $tr('youCan') }}
        <ul class="permissions-list">
          <li v-for="(value, key) in getUserPermissions" v-if="value" :key="key">
            {{ getPermissionString(key) }}
          </li>
        </ul>
      </p>
    </section>

    <form @submit.prevent="submitEdits">
      <ui-alert
        v-if="success"
        type="success"
        :dismissible="false"
      >
        {{ $tr('success') }}
      </ui-alert>
      <ui-alert
        v-if="unknownError"
        type="error"
        :dismissible="false"
      >
        {{ errorMessage }}
      </ui-alert>

      <k-textbox
        ref="name"
        v-if="canEditName"
        type="text"
        autocomplete="name"
        :autofocus="false"
        :label="$tr('name')"
        :disabled="busy"
        :maxlength="120"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        v-model="name"
      />
      <template v-else>
        <h2>{{ $tr('name') }}</h2>
        <p>{{ name }}</p>
      </template>

      <k-textbox
        ref="username"
        v-if="canEditUsername"
        type="text"
        autocomplete="username"
        :label="$tr('username')"
        :disabled="busy"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
        @input="resetProfileState"
        v-model="username"
      />
      <template v-else>
        <h2>{{ $tr('username') }}</h2>
        <p>{{ session.username }}</p>
      </template>

      <k-button
        v-if="canEditUsername || canEditName"
        type="submit"
        class="submit"
        :text="$tr('updateProfile')"
        :primary="true"
        :disabled="busy"
      />

    </form>

    <k-button
      v-if="canEditPassword"
      appearance="basic-link"
      :text="$tr('changePasswordPrompt')"
      :disabled="busy"
      class="change-password"
      @click="setPasswordModalVisible(true)"
    />

    <change-user-password-modal
      v-if="passwordModalVisible"
      @cancel="setPasswordModalVisible(false)"
    />
  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { validateUsername } from 'kolibri.utils.validators';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import PointsIcon from 'kolibri.coreVue.components.PointsIcon';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { PermissionTypes, UserKinds } from 'kolibri.coreVue.vuex.constants';
  import changeUserPasswordModal from './ChangeUserPasswordModal';

  export default {
    name: 'ProfilePage',
    $trs: {
      genericError: 'Something went wrong',
      success: 'Profile details updated',
      username: 'Username',
      name: 'Full name',
      updateProfile: 'Save changes',
      isLearner: 'Learner',
      isCoach: 'Coach',
      isAdmin: 'Admin',
      isSuperuser: 'Superuser permissions ',
      manageContent: 'Manage content',
      points: 'Points',
      role: 'Role',
      devicePermissions: 'Device permissions',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      required: 'This field is required',
      limitedPermissions: 'Limited permissions',
      youCan: 'You can',
      changePasswordPrompt: 'Change password',
      usernameAlreadyExists: 'An account with that username already exists',
      documentTitle: 'User Profile',
    },
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      KButton,
      KTextbox,
      uiAlert,
      PointsIcon,
      PermissionsIcon,
      changeUserPasswordModal,
    },
    mixins: [responsiveWindow],
    data() {
      return {
        username: this.$store.state.core.session.username,
        name: this.$store.state.core.session.full_name,
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
        'isAdmin',
        'isCoach',
        'isLearner',
        'isSuperuser',
        'totalPoints',
        'userHasPermissions',
      ]),
      ...mapState({
        backendErrorMessage: state => state.pageState.errorMessage,
        busy: state => state.pageState.busy,
        errorCode: state => state.pageState.errorCode,
        passwordModalVisible: state => state.pageState.passwordState.modal,
        session: state => state.core.session,
        success: state => state.pageState.success,
      }),
      role() {
        if (this.getUserKind === UserKinds.ADMIN) {
          return this.$tr('isAdmin');
        } else if (this.getUserKind === UserKinds.COACH) {
          return this.$tr('isCoach');
        } else if (this.getUserKind === UserKinds.LEARNER) {
          return this.$tr('isLearner');
        }
        return '';
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
          return this.facilityConfig.learnerCanEditUsername;
        }
        return true;
      },
      canEditName() {
        if (this.isCoach || this.isLearner) {
          return this.facilityConfig.learnerCanEditName;
        }
        return true;
      },
      canEditPassword() {
        return this.isSuperuser || this.facilityConfig.learnerCanEditPassword;
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
        return this.errorCode === 400;
      },
      unknownError() {
        if (this.errorCode) {
          return this.errorCode !== 400;
        }
        return false;
      },
      errorMessage() {
        return this.backendErrorMessage || this.$tr('genericError');
      },
      formIsValid() {
        return !this.usernameIsInvalid;
      },
    },
    created() {
      this.fetchPoints();
    },
    methods: {
      ...mapActions(['fetchPoints', 'updateUserProfile']),
      ...mapMutations({
        resetProfileState: 'RESET_PROFILE_STATE',
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
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  // taken from docs, assumes 1rem = 16px
  $vertical-page-margin: 50px;
  $iphone-width: 320px;

  .content {
    width: $iphone-width - 20px;
    padding-top: $vertical-page-margin;
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
    color: $core-status-correct;
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

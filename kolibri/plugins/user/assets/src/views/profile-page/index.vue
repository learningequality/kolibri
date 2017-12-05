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
        v-if="error"
        type="error"
        :dismissible="false"
      >
        {{ errorMessage || $tr('genericError') }}
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
  </div>

</template>


<script>

  import { editProfile, resetProfileState } from '../../state/actions';
  import {
    facilityConfig,
    isSuperuser,
    isAdmin,
    isCoach,
    isLearner,
    totalPoints,
    getUserRole,
    getUserPermissions,
    userHasPermissions,
  } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { validateUsername } from 'kolibri.utils.validators';
  import { fetchPoints } from 'kolibri.coreVue.vuex.actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import permissionsIcon from 'kolibri.coreVue.components.permissionsIcon';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { PermissionTypes, UserKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'profilePage',
    $trs: {
      genericError: 'Something went wrong',
      success: 'Profile details updated!',
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
    },
    components: {
      kButton,
      kTextbox,
      uiAlert,
      pointsIcon,
      permissionsIcon,
    },
    mixins: [responsiveWindow],
    data() {
      return {
        username: this.session.username,
        name: this.session.full_name,
        usernameBlurred: false,
        nameBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      role() {
        if (this.getUserRole === UserKinds.ADMIN) {
          return this.$tr('isAdmin');
        } else if (this.getUserRole === UserKinds.COACH) {
          return this.$tr('isCoach');
        } else if (this.getUserRole === UserKinds.LEARNER) {
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
        if (this.permissionType === PermissionTypes.SUPERUSER) {
          return this.$tr('isSuperuser');
        } else if (this.permissionType === PermissionTypes.LIMITED_PERMISSIONS) {
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
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username)) {
            return this.$tr('usernameNotAlphaNumUnderscore');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return !!this.usernameIsInvalidText;
      },
      formIsValid() {
        return !this.usernameIsInvalid;
      },
    },
    created() {
      this.fetchPoints();
    },
    methods: {
      submitEdits() {
        this.formSubmitted = true;
        this.resetProfileState();
        if (this.formIsValid) {
          const edits = {
            username: this.username,
            full_name: this.name,
          };
          this.editProfile(edits, this.session);
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
    vuex: {
      getters: {
        facilityConfig,
        isSuperuser,
        isAdmin,
        isCoach,
        isLearner,
        totalPoints,
        session: state => state.core.session,
        busy: state => state.pageState.busy,
        error: state => state.pageState.error,
        errorMessage: state => state.pageState.errorMessage,
        success: state => state.pageState.success,
        getUserRole,
        getUserPermissions,
        userHasPermissions,
      },
      actions: {
        editProfile,
        resetProfileState,
        fetchPoints,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // taken from docs, assumes 1rem = 16px
  $vertical-page-margin = 50px
  $iphone-width = 320

  .content
    padding-top: $vertical-page-margin
    margin-left: auto
    margin-right: auto
    width: ($iphone-width - 20)px

  .points-icon, .points-num
    display: inline-block

  .points-icon
    width: 2em
    height: 2em

  .points-num
    color: $core-status-correct
    font-size: 3em
    font-weight: bold
    margin-left: 16px

  section
    margin-bottom: 36px

  .permissions-list
    padding-left: 37px

  .permissions-icon
    padding-right: 8px

</style>

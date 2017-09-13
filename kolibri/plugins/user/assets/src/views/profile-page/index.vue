<template>

  <div class="content">
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
    <h3>{{ $tr('role') }}</h3>
    <p>{{ role }}</p>

    <h3>{{ $tr('points') }}</h3>
    <p>
      <points-icon class="points-icon" :active="true"/>
      <span class="points-num">{{ $formatNumber(totalPoints) }}</span>
    </p>

    <form @submit.prevent="submitEdits">

      <h3>{{ $tr('name') }}</h3>
      <k-textbox
        ref="name"
        v-if="canEditName"
        type="text"
        autocomplete="name"
        :autofocus="true"
        :label="$tr('name')"
        :disabled="busy"
        :maxlength="120"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        v-model="name"
      />
      <p v-else>{{ name }}</p>

      <h3>{{ $tr('username') }}</h3>
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
      <p v-else>{{ session.username }}</p>

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
  } from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { validateUsername } from 'kolibri.utils.validators';
  import { fetchPoints } from 'kolibri.coreVue.vuex.actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  import uiAlert from 'keen-ui/src/UiAlert';

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
      isSuperuser: 'Device Owner',
      points: 'Points',
      role: 'Role',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
      required: 'This field is required',
    },
    components: {
      kButton,
      kTextbox,
      uiAlert,
      pointsIcon,
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
        if (this.isSuperuser) {
          return this.$tr('isSuperuser');
        } else if (this.isAdmin) {
          return this.$tr('isAdmin');
        } else if (this.isCoach) {
          return this.$tr('isCoach');
        } else if (this.isLearner) {
          return this.$tr('isLearner');
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
  $vertical-page-margin = 100px
  $iphone-width = 320

  .content
    padding-top: $vertical-page-margin
    margin-left: auto
    margin-right: auto
    width: ($iphone-width - 20)px

  .submit
    margin-left: auto
    margin-right: auto
    display: block


  .points-icon, .points-num
    display: inline-block

  .points-icon
    width: 2em
    height: 2em

  .points-num
    color: $core-status-correct
    font-size: 3em
    font-weight: bold

</style>

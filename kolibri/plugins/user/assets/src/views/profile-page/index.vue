<template>

  <div class="content">
    <ui-alert type="success" @dismiss="resetProfileState" v-if="success">
      {{ $tr('success') }}
    </ui-alert>

    <h3>{{ $tr('role') }}</h3>
    <p>{{ role }}</p>

    <template v-if="!isSuperuser">
      <h3>{{ $tr('points') }}</h3>
      <p>
        <points-icon class="points-icon" :active="true"/>
        <span class="points-num">{{ $formatNumber(totalPoints) }}</span>
      </p>
    </template>

    <template v-if="!canEditUsername">
      <h3>{{ $tr('username') }}</h3>
      <p>{{ session.username }}</p>
    </template>

    <template v-if="!canEditName">
      <h3>{{ $tr('name') }}</h3>
      <p>{{ session.full_name }}</p>
    </template>

    <form v-if="canEditUsername || canEditName" @submit.prevent="submitEdits">

      <template v-if="canEditUsername">
        <h3>{{ $tr('username') }}</h3>
        <core-textbox
          :disabled="busy"
          :invalid="error"
          :error="errorMessage"
          v-model="username"
          autocomplete="username"
          type="text" />
      </template>

      <template v-if="canEditName">
        <h3>{{ $tr('name') }}</h3>
        <core-textbox
          :disabled="busy"
          v-model="full_name"
          autocomplete="name"
          type="text" />
      </template>

      <k-button
        :disabled="busy"
        :primary="true"
        :text="$tr('updateProfile')"
        class="submit"
        type="submit" />
    </form>
  </div>

</template>


<script>

  import * as actions from '../../state/actions';
  import * as getters from 'kolibri.coreVue.vuex.getters';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { totalPoints } from 'kolibri.coreVue.vuex.getters';
  import { fetchPoints } from 'kolibri.coreVue.vuex.actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreTextbox from 'kolibri.coreVue.components.textbox';
  import uiAlert from 'keen-ui/src/UiAlert';
  import pointsIcon from 'kolibri.coreVue.components.pointsIcon';
  export default {
    name: 'profile-page',
    $trNameSpace: 'profilePage',
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
    },
    components: {
      kButton,
      coreTextbox,
      uiAlert,
      pointsIcon,
    },
    data() {
      return {
        username: this.session.username,
        full_name: this.session.full_name,
      };
    },
    created() {
      this.fetchPoints();
    },
    computed: {
      errorMessage() {
        if (this.error) {
          if (this.backendErrorMessage) {
            return this.backendErrorMessage;
          }
          return this.$tr('genericError');
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
    },
    methods: {
      submitEdits() {
        const edits = {
          username: this.username,
          full_name: this.full_name,
        };
        this.editProfile(edits, this.session);
      },
    },
    vuex: {
      getters: {
        facilityConfig: getters.facilityConfig,
        session: state => state.core.session,
        error: state => state.pageState.error,
        success: state => state.pageState.success,
        busy: state => state.pageState.busy,
        backendErrorMessage: state => state.pageState.errorMessage,
        isSuperuser: getters.isSuperuser,
        isAdmin: getters.isAdmin,
        isCoach: getters.isCoach,
        isLearner: getters.isLearner,
        totalPoints,
      },
      actions: {
        editProfile: actions.editProfile,
        resetProfileState: actions.resetProfileState,
        fetchPoints,
      },
    },
    mixins: [responsiveWindow],
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

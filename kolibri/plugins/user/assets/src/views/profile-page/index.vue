<template>

  <div class="content">
    <ui-alert type="success" @dismiss="resetProfileState" v-if="success">
      {{$tr('success')}}
    </ui-alert>
    <div class="points">
      <span class="top">{{ $tr('yourPoints') }}</span>
      <points-icon class="in-points" :active="true" :width="'2em'" :height="'2em'"/>
      <span class="total in-points">{{ $formatNumber(totalPoints) }}</span>
    </div>
    <form @submit.prevent="submitEdits">

      <core-textbox
        v-if="hasPrivilege('username')"
        class="input-field"
        :invalid="error"
        :error="errorMessage"
        :label="$tr('username')"
        :value="session.username"
        disabled
        autocomplete="username"
        id="username"
        type="text" />

      <p v-if="isLearner" class="type">{{ $tr('isLearner') }}</p>
      <p v-if="isCoach" class="type">{{ $tr('isCoach') }}</p>
      <p v-if="isAdmin" class="type">{{ $tr('isAdmin') }}</p>
      <p v-if="isSuperuser" class="type">{{ $tr('isSuperuser') }}</p>

      <core-textbox
        v-if="hasPrivilege('name') && !isSuperuser"
        class="input-field"
        :disabled="busy"
        :label="$tr('name')"
        v-model="full_name"
        autocomplete="name"
        id="name"
        type="text" />

      <icon-button
        v-if="!isSuperuser"
        :disabled="busy"
        :primary="true"
        :text="$tr('updateProfile')"
        id="submit"
        type="submit" />
    </form>
  </div>

</template>


<script>

  const actions = require('../../state/actions');
  const getters = require('kolibri.coreVue.vuex.getters');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');
  const { totalPoints } = require('kolibri.coreVue.vuex.getters');
  const { fetchPoints } = require('kolibri.coreVue.vuex.actions');

  module.exports = {
    name: 'profile-page',
    $trNameSpace: 'profilePage',
    $trs: {
      genericError: 'Something went wrong',
      success: 'Profile details updated!',
      username: 'Username',
      name: 'Name',
      updateProfile: 'Update profile',
      isLearner: '(you are a Learner)',
      isCoach: '(you are a Coach)',
      isAdmin: '(you are an Admin)',
      isSuperuser: '(you are a Device Owner)',
      yourPoints: 'Your points',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'ui-alert': require('keen-ui/src/UiAlert'),
      'points-icon': require('kolibri.coreVue.components.pointsIcon'),
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
    },
    methods: {
      hasPrivilege(privilege) {
        return this.privileges[privilege];
      },
      submitEdits() {
        const edits = {
          full_name: this.full_name,
        };
        this.editProfile(edits, this.session);
      },
    },
    vuex: {
      getters: {
        privileges: state => state.core.learnerPrivileges,
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
  $ui-input-height = 68px
  $vertical-page-margin = 100px
  $iphone-width = 320

  .content
    padding-top: $vertical-page-margin
    margin-left: auto
    margin-right: auto
    overflow-y: auto
    width: ($iphone-width - 20)px

  #submit
    margin-left: auto
    margin-right: auto
    display: block
    margin-top: $vertical-page-margin
    width: 98%

  .advanced-option
    color: $core-action-light
    width: 100%
    display: inline-block
    font-size: 0.9em

  .type
    text-align: right
    font-size: smaller

  .points
    padding-bottom: 0.5em

  .in-points
    display: inline-block

  .total
    color: $core-accent-color
    font-size: 3em
    font-weight: bold
    padding-left: 0.2em

  .top
    color: $core-text-annotation
    clearfix()

</style>

<template>

  <div class="content">
    <ui-alert type="success" @dismiss="resetProfileState" v-if="success">
      {{$tr('success')}}
    </ui-alert>
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

      <core-textbox
        v-if="hasPrivilege('name')"
        class="input-field"
        :disabled="busy"
        :label="$tr('name')"
        v-model="full_name"
        autocomplete="name"
        id="name"
        type="text" />

      <icon-button
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
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    name: 'profile-page',
    $trNameSpace: 'profile-page',
    $trs: {
      genericError: 'Something went wrong',
      success: 'Profile details updated!',
      username: 'Username',
      name: 'Name',
      updateProfile: 'Update',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'ui-alert': require('keen-ui/src/UiAlert'),
    },
    data() {
      return {
        username: this.session.username,
        full_name: this.session.full_name,
      };
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
      },
      actions: {
        editProfile: actions.editProfile,
        resetProfileState: actions.resetProfileState,
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

</style>

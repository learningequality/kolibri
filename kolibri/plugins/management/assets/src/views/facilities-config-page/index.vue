<template>

  <div>
    <div>
      <h2>Facilities Configuration</h2>
      <p>Configure and change different Facility settings here.</p>
    </div>

    <div>
      <h3>Your current Facility</h3>
      <p class="current-facility-name">
        {{ currentFacilityName }}
      </p>
    </div>

    <div>
      <h2>Facility Settings</h2>
      <div class="settings">
        <ui-checkbox
          :value="settings.learner_can_edit_username"
          @change="toggleSetting('learner_can_edit_username')"
          box-position="right"
          name="edit_username"
        >
          Allow users to edit their username
        </ui-checkbox>
        <ui-checkbox
          :value="settings.learner_can_edit_name"
          @change="toggleSetting('learner_can_edit_name')"
          box-position="right"
          name="edit_fullname"
        >
          Allow users to edit their full name
        </ui-checkbox>
        <ui-checkbox
          :value="settings.learner_can_edit_password"
          @change="toggleSetting('learner_can_edit_password')"
          box-position="right"
          name="edit_password"
        >
          Allow users to change their password when logged in
        </ui-checkbox>
        <ui-checkbox
          :value="settings.learner_can_delete_account"
          @change="toggleSetting('learner_can_delete_account')"
          box-position="right"
          name="can_delete_acct"
        >
          Allow users to delete their account
        </ui-checkbox>
        <ui-checkbox
          :value="settings.learner_can_sign_up"
          @change="toggleSetting('learner_can_sign_up')"
          box-position="right"
          name="can_signup"
        >
          Permit users to sign-up on this device
        </ui-checkbox>
        <!-- <ui-checkbox box-position="right">
          Require users to log-in on this device
        </ui-checkbox> -->
      </div>

      <div>
        <ui-button name="reset-settings" @click="resetToDefaultSettings">
          Reset to default settings
        </ui-button>
        <ui-button color="primary" name="save-settings" @click="saveChanges">
          Save changes
        </ui-button>
      </div>
    </div>


  </div>

</template>


<script>

  module.exports = {
    components: {
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    data: () => ({
      checked: true
    }),
    computed: {

    },
    methods: {

    },
    vuex: {
      getters: {
        currentFacilityName: () => 'Nalanda Maths',
        settings: state => state.pageState.settings,
      },
      actions: {
        toggleSetting(store, settingName) {
          store.dispatch('CONFIG_PAGE_MODIFY_SETTING', {
            name: settingName,
            value: !this.settings[settingName]
          });
        },
        resetToDefaultSettings(store) {
          console.log('reset', store);
        },
        saveChanges(store) {
          console.log('save changes', store);
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .settings
    max-width: 35rem

  .settings > label
    cursor: pointer
    font-weight: bold
    margin: 2rem 0

</style>

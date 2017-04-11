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
        <ui-checkbox box-position="right">
          Allow users to edit their username
        </ui-checkbox>
        <ui-checkbox box-position="right">
          Allow users to edit their full name
        </ui-checkbox>
        <ui-checkbox box-position="right">
          Allow users to change their password when logged in
        </ui-checkbox>
        <ui-checkbox box-position="right">
          Allow users to delete their account
        </ui-checkbox>
        <ui-checkbox box-position="right">
          Permit users to sign-up on this device
        </ui-checkbox>
        <ui-checkbox box-position="right">
          Require users to log-in on this device
        </ui-checkbox>
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
    computed: {

    },
    methods: {

    },
    vuex: {
      getters: {
        currentFacilityName: () => 'Nalanda Maths',
      },
      actions: {
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

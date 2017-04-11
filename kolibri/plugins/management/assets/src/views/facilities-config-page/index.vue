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
    </div>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
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
    margin: 1.5rem 0

</style>

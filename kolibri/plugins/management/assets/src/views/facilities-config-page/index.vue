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
        <template v-for="setting in settingsList">
          <ui-checkbox
            :name="setting"
            :value="settings[setting]"
            @change="toggleSetting(setting)"
            box-position="right"
          >
            {{ $tr(setting) }}
          </ui-checkbox>
        </template>
      </div>

      <div>
        <ui-button
          class="mr"
          name="reset-settings"
          @click="showModal=true"
        >
          Reset to default settings
        </ui-button>
        <span class="space" />
        <ui-button color="primary" name="save-settings" @click="saveChanges">
          Save changes
        </ui-button>
      </div>
    </div>

    <confirm-reset-modal
      id="confirm-reset"
      v-if="showModal"
      @click-confirm="resetToDefaultSettings()"
      @click-cancel="showModal=false"
    />
  </div>

</template>


<script>

  module.exports = {
    components: {
      'confirm-reset-modal': require('./confirm-reset-modal'),
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'ui-button': require('keen-ui/src/UiButton'),
    },
    data: () => ({
      showModal: false,
    }),
    computed: {
      settingsList: () => [
        'learner_can_edit_username',
        'learner_can_edit_name',
        'learner_can_edit_password',
        'learner_can_delete_account',
        'learner_can_sign_up',
      ],
    },
    methods: {

    },
    vuex: {
      getters: {
        currentFacilityName: state => state.pageState.facilityName,
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
          console.log('reset');
        },
        saveChanges(store) {
          console.log('save changes', store);
        },
      },
    },
    $trNameSpace: 'facilityConfigPage',
    $trs: {
      learner_can_edit_username: 'Allow users to edit their username',
      learner_can_edit_name: 'Allow users to edit their full name',
      learner_can_edit_password: 'Allow users to change their password when logged in',
      learner_can_delete_account: 'Allow users to delete their account',
      learner_can_sign_up: 'Allow users to sign-up on this device',
    }
  };

</script>


<style lang="stylus" scoped>
  .mr
    margin-right: 5px

  .settings
    max-width: 35rem

  .settings > label
    cursor: pointer
    font-weight: bold
    margin: 2rem 0

</style>

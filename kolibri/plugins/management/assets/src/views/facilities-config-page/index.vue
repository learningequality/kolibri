<template>

  <div>
    <div class="mb">
      <h1>{{ $tr('pageHeader') }}</h1>
      <p>{{ $tr('pageDescription') }}</p>
    </div>

    <template v-if="settings!==null">
      <div class="mb">
        <h2>{{ $tr('currentFacilityHeader') }}</h2>
        <p class="current-facility-name">
          {{ currentFacilityName }}
        </p>
      </div>

      <div class="mb">
        <div class="settings">
          <h2>{{ $tr('settingsHeader') }}</h2>
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
          <k-button
            :primary="false"
            :raised="true"
            @click="showModal=true"
            :text="$tr('resetToDefaultSettings')"
          />

          <k-button
            :primary="true"
            :raised="true"
            @click="saveFacilityConfig()"
            :text="$tr('saveChanges')"
          />
        </div>
      </div>
    </template>

    <notifications
      :notification="notification"
      @dismiss="dismissNotification()"
    />

    <confirm-reset-modal
      id="confirm-reset"
      v-if="showModal"
      @click-confirm="resetToDefaultSettings()"
      @click-cancel="showModal=false"
    />
  </div>

</template>


<script>

  import * as actions from '../../state/actions';
  const settingsList = [
    'learnerCanEditUsername',
    'learnerCanEditName',
    'learnerCanSignUp',
    'learnerCanLoginWithNoPassword',
  ];
  import confirmResetModal from './confirm-reset-modal';
  import notifications from './config-page-notifications';
  import uiCheckbox from 'keen-ui/src/UiCheckbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    components: {
      confirmResetModal,
      notifications,
      uiCheckbox,
      kButton,
    },
    data: () => ({ showModal: false }),
    computed: { settingsList: () => settingsList },
    methods: {
      resetToDefaultSettings() {
        this.showModal = false;
        this.resetFacilityConfig();
      },
    },
    vuex: {
      getters: {
        currentFacilityName: state => state.pageState.facilityName,
        settings: state => state.pageState.settings,
        notification: state => state.pageState.notification,
      },
      actions: {
        toggleSetting(store, settingName) {
          store.dispatch('CONFIG_PAGE_MODIFY_SETTING', {
            name: settingName,
            value: !this.settings[settingName],
          });
        },
        saveFacilityConfig: actions.saveFacilityConfig,
        resetFacilityConfig: actions.resetFacilityConfig,
        dismissNotification(store) {
          store.dispatch('CONFIG_PAGE_NOTIFY', null);
        },
      },
    },
    $trNameSpace: 'facilityConfigPage',
    $trs: {
      currentFacilityHeader: 'Your current Facility',
      learnerCanDeleteAccount: 'Allow users to delete their account',
      learnerCanEditName: 'Allow users to edit their full name',
      learnerCanEditPassword: 'Allow users to change their password when signed in',
      learnerCanEditUsername: 'Allow users to edit their username',
      learnerCanSignUp: 'Allow users to sign-up on this device',
      learnerCanLoginWithNoPassword: 'Allow learners to sign in with no password',
      pageDescription: 'Configure and change different Facility settings here.',
      pageHeader: 'Facility Configuration',
      resetToDefaultSettings: 'Reset to default settings',
      saveChanges: 'Save changes',
      settingsHeader: 'Facility Settings',
    },
  };

</script>


<style lang="stylus" scoped>

  .mb
    margin-bottom: 2rem

  .settings
    max-width: 35rem

  .settings > label
    cursor: pointer
    font-weight: bold
    margin-bottom: 2rem

</style>

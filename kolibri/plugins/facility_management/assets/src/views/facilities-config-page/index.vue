<template>

  <div>

    <notifications
      :notification="notification"
      @dismiss="dismissNotification()"
    />

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
          <template v-for="setting in settingsList">
            <k-checkbox
              :label="$tr(setting)"
              :checked="settings[setting]"
              @change="toggleSetting(setting)"
              :key="setting"
            />
          </template>
        </div>

        <div>
          <k-button
            :primary="false"
            appearance="raised-button"
            @click="showModal=true"
            :text="$tr('resetToDefaultSettings')"
            name="reset-settings"
          />

          <k-button
            :primary="true"
            appearance="raised-button"
            @click="saveConfig()"
            :text="$tr('saveChanges')"
            name="save-settings"
            :disabled="!settingsHaveChanged"
          />
        </div>
      </div>
    </template>

    <confirm-reset-modal
      id="confirm-reset"
      v-if="showModal"
      @click-confirm="resetToDefaultSettings()"
      @click-cancel="showModal=false"
    />
  </div>

</template>


<script>

  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import isEqual from 'lodash/isEqual';
  import { saveFacilityConfig, resetFacilityConfig } from '../../state/actions';
  import confirmResetModal from './confirm-reset-modal';
  import notifications from './config-page-notifications';

  const settingsList = [
    'learnerCanEditUsername',
    'learnerCanEditName',
    'learnerCanSignUp',
    'learnerCanLoginWithNoPassword',
    'showDownloadButtonInLearn',
  ];

  export default {
    name: 'facilityConfigPage',
    components: {
      confirmResetModal,
      notifications,
      kCheckbox,
      kButton,
    },
    data: () => ({
      showModal: false,
      settingsCopy: {},
    }),
    computed: {
      settingsList: () => settingsList,
      settingsHaveChanged() {
        return !isEqual(this.settings, this.settingsCopy);
      },
    },
    mounted() {
      this.copySettings();
    },
    methods: {
      resetToDefaultSettings() {
        this.showModal = false;
        this.resetFacilityConfig();
      },
      saveConfig() {
        this.saveFacilityConfig().then(() => {
          this.copySettings();
        });
      },
      copySettings() {
        this.settingsCopy = Object.assign({}, this.settings);
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
        saveFacilityConfig,
        resetFacilityConfig,
        dismissNotification(store) {
          store.dispatch('CONFIG_PAGE_NOTIFY', null);
        },
      },
    },
    $trs: {
      currentFacilityHeader: 'Facility',
      learnerCanEditName: 'Allow learners and coaches to edit their full name',
      learnerCanEditPassword: 'Allow learners and coaches to change their password when signed in',
      learnerCanEditUsername: 'Allow learners and coaches to edit their username',
      learnerCanSignUp: 'Allow learners to sign-up on this device',
      learnerCanLoginWithNoPassword: 'Allow learners to sign in with no password',
      showDownloadButtonInLearn: "Show 'download' button with content",
      pageDescription: 'Configure and change different facility settings here.',
      pageHeader: 'Facility settings',
      resetToDefaultSettings: 'Reset to default settings',
      saveChanges: 'Save changes',
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

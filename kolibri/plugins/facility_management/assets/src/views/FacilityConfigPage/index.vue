<template>

  <div>

    <Notifications
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
          {{ facilityName }}
        </p>
      </div>

      <div class="mb">
        <div class="settings">
          <template v-for="setting in settingsList">
            <KCheckbox
              :key="setting"
              :label="$tr(setting)"
              :checked="settings[setting]"
              @change="toggleSetting(setting)"
            />
          </template>
        </div>

        <div>
          <KButton
            :primary="false"
            appearance="raised-button"
            :text="$tr('resetToDefaultSettings')"
            name="reset-settings"
            @click="showModal=true"
          />

          <KButton
            :primary="true"
            appearance="raised-button"
            :text="$tr('saveChanges')"
            name="save-settings"
            :disabled="!settingsHaveChanged"
            @click="saveConfig()"
          />
        </div>
      </div>
    </template>

    <ConfirmResetModal
      v-if="showModal"
      id="confirm-reset"
      @click-confirm="resetToDefaultSettings"
      @click-cancel="showModal=false"
    />
  </div>

</template>


<script>

  import { mapState, mapActions, mapMutations } from 'vuex';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import KButton from 'kolibri.coreVue.components.KButton';
  import isEqual from 'lodash/isEqual';
  import ConfirmResetModal from './ConfirmResetModal';
  import Notifications from './ConfigPageNotifications';

  const settingsList = [
    'learnerCanEditUsername',
    'learnerCanEditName',
    'learnerCanSignUp',
    'learnerCanLoginWithNoPassword',
    'showDownloadButtonInLearn',
    'allowGuestAccess',
  ];

  export default {
    name: 'FacilityConfigPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ConfirmResetModal,
      Notifications,
      KCheckbox,
      KButton,
    },
    data() {
      return {
        showModal: false,
        settingsCopy: {},
      };
    },
    computed: {
      ...mapState('facilityConfig', ['facilityName', 'settings', 'notification']),
      settingsList: () => settingsList,
      settingsHaveChanged() {
        return !isEqual(this.settings, this.settingsCopy);
      },
    },
    mounted() {
      this.copySettings();
    },
    methods: {
      ...mapActions('facilityConfig', ['saveFacilityConfig', 'resetFacilityConfig']),
      ...mapMutations('facilityConfig', {
        configPageModifySetting: 'CONFIG_PAGE_MODIFY_SETTING',
        configPageNotify: 'CONFIG_PAGE_NOTIFY',
      }),
      toggleSetting(settingName) {
        this.configPageModifySetting({
          name: settingName,
          value: !this.settings[settingName],
        });
      },
      dismissNotification() {
        this.configPageNotify(null);
      },
      resetToDefaultSettings() {
        this.showModal = false;
        this.resetFacilityConfig().then(() => {
          this.copySettings();
        });
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
    $trs: {
      currentFacilityHeader: 'Facility',
      learnerCanEditName: 'Allow learners and coaches to edit their full name',
      learnerCanEditPassword: 'Allow learners and coaches to change their password when signed in',
      learnerCanEditUsername: 'Allow learners and coaches to edit their username',
      learnerCanSignUp: 'Allow learners to create accounts',
      learnerCanLoginWithNoPassword: 'Allow learners to sign in with no password',
      showDownloadButtonInLearn: "Show 'download' button with content",
      allowGuestAccess: 'Allow users to access content without signing in',
      pageDescription: 'Configure various settings',
      pageHeader: 'Facility settings',
      resetToDefaultSettings: 'Reset to defaults',
      saveChanges: 'Save changes',
      documentTitle: 'Configure Facility',
    },
  };

</script>


<style lang="scss" scoped>

  .mb {
    margin-bottom: 2rem;
  }

  .settings {
    max-width: 35rem;
  }

  .settings > label {
    margin-bottom: 2rem;
    font-weight: bold;
    cursor: pointer;
  }

</style>

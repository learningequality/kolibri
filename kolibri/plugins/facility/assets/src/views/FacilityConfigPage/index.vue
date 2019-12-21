<template>

  <KPageContainer>

    <Notifications
      :notification="notification"
      @dismiss="dismissNotification()"
    />

    <div class="mb">
      <h1>{{ $tr('pageHeader') }}</h1>
      <p>
        {{ $tr('pageDescription') }}
        <KExternalLink
          v-if="isSuperuser && deviceSettingsUrl"
          :text="$tr('deviceSettings')"
          :href="deviceSettingsUrl"
        />
      </p>
    </div>

    <template v-if="settings!==null">
      <div class="mb">
        <h2>{{ coreString('facilityLabel') }}</h2>
        <p class="current-facility-name">
          {{ facilityName }}
        </p>
      </div>

      <div class="mb">
        <div class="settings">
          <template v-for="setting in settingsList">
            <KCheckbox
              :key="setting"
              :label="$tr(camelCase(setting))"
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
            :text="coreString('saveChangesAction')"
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
      @submit="resetToDefaultSettings"
      @cancel="showModal=false"
    />
  </KPageContainer>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import camelCase from 'lodash/camelCase';
  import isEqual from 'lodash/isEqual';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import urls from 'kolibri.urls';
  import ConfirmResetModal from './ConfirmResetModal';
  import Notifications from './ConfigPageNotifications';

  // See FacilityDataset in core.auth.models for details
  const settingsList = [
    'learner_can_edit_username',
    'learner_can_edit_password',
    'learner_can_edit_name',
    'learner_can_sign_up',
    'learner_can_login_with_no_password',
    'show_download_button_in_learn',
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
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        showModal: false,
        settingsCopy: {},
      };
    },
    computed: {
      ...mapState('facilityConfig', ['facilityName', 'settings', 'notification']),
      ...mapGetters(['isSuperuser']),
      settingsList: () => settingsList,
      settingsHaveChanged() {
        return !isEqual(this.settings, this.settingsCopy);
      },
      deviceSettingsUrl() {
        const getUrl = urls['kolibri:kolibri.plugins.device:device_management'];
        if (getUrl) {
          return getUrl() + '#/settings';
        }
        return null;
      },
    },
    mounted() {
      this.copySettings();
    },
    methods: {
      camelCase,
      toggleSetting(settingName) {
        this.$store.commit('facilityConfig/CONFIG_PAGE_MODIFY_SETTING', {
          name: settingName,
          value: !this.settings[settingName],
        });
      },
      dismissNotification() {
        this.$store.commit('facilityConfig/CONFIG_PAGE_NOTIFY', null);
      },
      resetToDefaultSettings() {
        this.showModal = false;
        this.$store.dispatch('facilityConfig/resetFacilityConfig').then(() => {
          this.copySettings();
        });
      },
      saveConfig() {
        this.$store.dispatch('facilityConfig/saveFacilityConfig').then(() => {
          this.copySettings();
        });
      },
      copySettings() {
        this.settingsCopy = Object.assign({}, this.settings);
      },
    },
    $trs: {
      // These are not going to be picked up by the linter because snake cased versions
      // are used to get the keys to these strings.
      /* eslint-disable kolibri/vue-no-unused-translations */
      learnerCanEditName: 'Allow learners and coaches to edit their full name',
      learnerCanEditPassword: 'Allow learners and coaches to change their password when signed in',
      learnerCanEditUsername: 'Allow learners and coaches to edit their username',
      learnerCanSignUp: 'Allow learners to create accounts',
      learnerCanLoginWithNoPassword: 'Allow learners to sign in with no password',
      showDownloadButtonInLearn: "Show 'download' button with resources",
      allowGuestAccess: 'Allow users to access resources without signing in',
      /* eslint-enable kolibri/vue-no-unused-translations */
      pageDescription: {
        message: 'Configure facility settings here.',
        context: '\nInterpret as "[You can] configure facility settings here"',
      },
      deviceSettings: 'You can also configure device settings',
      pageHeader: 'Facility settings',
      resetToDefaultSettings: 'Reset to defaults',
      documentTitle: 'Configure Facility',
    },
  };

</script>


<style lang="scss" scoped>

  .mb {
    margin-bottom: 2rem;
  }

  .settings > label {
    margin-bottom: 2rem;
    font-weight: bold;
    cursor: pointer;
  }

</style>

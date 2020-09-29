<template>

  <KPageContainer>

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

    <template v-if="settings !== null">
      <div class="mb">
        <h2>{{ coreString('facilityLabel') }}</h2>
        <p class="current-facility-name">
          {{ coreString('facilityNameWithId', { facilityName: facilityName, id: lastPartId }) }}
          <KButton
            appearance="basic-link"
            :text="coreString('editAction')"
            name="edit-facilityname"
            @click="showEditFacilityModal = true"
          />

        </p>
      </div>

      <div class="mb">
        <div class="settings">
          <template v-for="setting in settingsList">
            <template
              v-if="
                setting !== 'learner_can_edit_password' &&
                  setting !== 'learner_can_login_with_no_password'
              "
            >
              <KCheckbox
                :key="setting"
                :label="$tr(camelCase(setting))"
                :checked="settings[setting]"
                @change="toggleSetting(setting)"
              />
            </template>
            <template v-else-if="setting === 'learner_can_login_with_no_password'">
              <KCheckbox
                :key="setting"
                :label="$tr('learnerNeedPasswordToLogin')"
                :checked="!settings['learner_can_login_with_no_password']"
                @change="toggleLearnerLoginPassword()"
              />
              <KCheckbox
                :key="setting + 'learner_can_edit_password'"
                :disabled="enableChangePassword"
                :label="$tr('learnerCanEditPassword')"
                :checked="!settings['learner_can_login_with_no_password']
                  && settings['learner_can_edit_password']"
                class="checkbox-password"
                @change="toggleSetting('learner_can_edit_password')"
              />
            </template>
          </template>
        </div>

        <div>
          <KButtonGroup style="margin-top: 8px;">
            <KButton
              :primary="false"
              appearance="raised-button"
              :text="$tr('resetToDefaultSettings')"

              name="reset-settings"
              @click="showModal = true"
            />

            <KButton
              :primary="true"
              appearance="raised-button"
              :text="coreString('saveChangesAction')"
              name="save-settings"

              :disabled="!settingsHaveChanged"
              @click="saveConfig()"
            />
          </KButtonGroup>
        </div>
      </div>
    </template>

    <ConfirmResetModal
      v-if="showModal"
      id="confirm-reset"
      @submit="resetToDefaultSettings"
      @cancel="showModal = false"
    />
    <EditFacilityNameModal
      v-if="showEditFacilityModal"
      id="edit-facility"
      :facilityName="facilityName"
      @submit="sendFacilityName"
      @cancel="showEditFacilityModal = false"
    />
  </KPageContainer>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { mapActions, mapGetters, mapState } from 'vuex';
  import camelCase from 'lodash/camelCase';
  import isEqual from 'lodash/isEqual';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import urls from 'kolibri.urls';
  import ConfirmResetModal from './ConfirmResetModal';
  import EditFacilityNameModal from './EditFacilityNameModal';
  // TODO: Notification component is empty and should be removed on 0.15 version
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
      EditFacilityNameModal,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        showModal: false,
        showEditFacilityModal: false,
        settingsCopy: {},
      };
    },
    computed: {
      ...mapState('facilityConfig', [
        'facilityName',
        'facilityId',
        'settings',
        'facilityNameSaved',
        'facilityNameError',
      ]),
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
      lastPartId() {
        return this.facilityId.slice(0, 4);
      },
      enableChangePassword() {
        return this.settings['learner_can_login_with_no_password'];
      },
      NotificationsStrings() {
        return crossComponentTranslator(Notifications);
      },
    },
    watch: {
      facilityNameSaved(val) {
        if (val) {
          this.createSnackbar(this.coreString('changesSavedNotification'));
          this.$store.commit('facilityConfig/RESET_FACILITY_NAME_STATES');
        }
      },
      facilityNameError(val) {
        if (val) {
          this.createSnackbar(this.coreString('changesNotSavedNotification'));
          this.$store.commit('facilityConfig/RESET_FACILITY_NAME_STATES');
        }
      },
    },
    mounted() {
      this.copySettings();
    },
    methods: {
      camelCase,
      ...mapActions('facilityConfig', ['saveFacilityName']),
      ...mapActions(['createSnackbar']),
      toggleSetting(settingName) {
        this.$store.commit('facilityConfig/CONFIG_PAGE_MODIFY_SETTING', {
          name: settingName,
          value: !this.settings[settingName],
        });
      },
      toggleLearnerLoginPassword() {
        this.toggleSetting('learner_can_login_with_no_password');
        if (
          this.settings['learner_can_edit_password'] &&
          !this.settings['learner_can_login_with_no_password']
        ) {
          this.toggleSetting('learner_can_edit_password');
        }
      },
      updateSettings(action) {
        this.$store
          .dispatch(action)
          .then(() => {
            // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
            this.createSnackbar(this.NotificationsStrings.$tr('saveSuccess'));
            this.copySettings();
          })
          .catch(() => {
            // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
            this.createSnackbar(this.NotificationsStrings.$tr('saveFailure'));
            this.$store.commit('CONFIG_PAGE_UNDO_SETTINGS_CHANGE');
          });
      },
      resetToDefaultSettings() {
        this.showModal = false;
        this.updateSettings('facilityConfig/resetFacilityConfig');
      },
      sendFacilityName(name) {
        this.showEditFacilityModal = false;
        if (name != this.facilityName) this.saveFacilityName({ name: name, id: this.facilityId });
      },
      saveConfig() {
        this.updateSettings('facilityConfig/saveFacilityConfig');
      },
      copySettings() {
        this.settingsCopy = Object.assign({}, this.settings);
      },
    },
    $trs: {
      // These are not going to be picked up by the linter because snake cased versions
      // are used to get the keys to these strings.
      /* eslint-disable kolibri/vue-no-unused-translations */
      learnerCanEditName: 'Allow learners to edit their full name',
      learnerCanEditPassword: 'Allow learners to edit their password when signed in',
      learnerCanEditUsername: 'Allow learners to edit their username',
      learnerCanSignUp: 'Allow learners to create accounts',
      learnerCanLoginWithNoPassword: 'Allow learners to sign in with no password',
      learnerNeedPasswordToLogin: 'Require password for learners',
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

  .checkbox-password {
    margin-left: 24px;
  }

</style>

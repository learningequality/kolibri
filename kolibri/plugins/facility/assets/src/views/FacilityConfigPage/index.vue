<template>

  <FacilityAppBarPage>
    <KPageContainer
      data-test="page-container"
      :style="{ marginBottom: '42px' }"
    >
      <p>
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'FacilityConfigPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
      </p>
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
            <KCircularLoader
              v-if="getFacilityDataLoading"
              class="facility-loader"
            />
            <span v-else>
              {{ coreString('facilityNameWithId', { facilityName: facilityName, id: lastPartId }) }}
              <KButton
                appearance="basic-link"
                :text="coreString('editAction')"
                :disabled="getFacilityDataLoading"
                name="edit-facilityname"
                @click="showEditFacilityModal = true"
              />
            </span>
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
                  :checked="
                    !settings['learner_can_login_with_no_password'] &&
                      settings['learner_can_edit_password']
                  "
                  class="checkbox-password"
                  @change="toggleSetting('learner_can_edit_password')"
                />
              </template>
            </template>
          </div>

          <div></div>
        </div>

        <div class="">
          <h2>{{ $tr('deviceManagementPin') }}</h2>

          <p>{{ $tr('deviceManagementDescription') }}</p>
          <KButton
            v-show="!isPinSet"
            @click="handleCreatePin"
          >
            {{ $tr('createPinBtn') }}
          </KButton>

          <KButton
            v-show="isPinSet"
            hasDropdown
            :text="coreString('optionsLabel')"
          >
            <template #menu>
              <KDropdownMenu
                :options="dropdownOption"
                :constrainToScrollParent="false"
                class="options-btn"
                @select="handleSelect"
              />
            </template>
          </KButton>
        </div>

        <div
          v-if="isAppContext"
          :style="{
            marginTop: '32px',
            borderTop: '1px solid',
            borderTopColor: $themeTokens.fineLine,
          }"
        >
          <KButtonGroup :style="{ marginTop: '24px', marginLeft: '-8px' }">
            <KButton
              :primary="true"
              appearance="raised-button"
              :text="coreString('saveChangesAction')"
              name="save-settings"
              :disabled="!settingsHaveChanged"
              @click="saveConfig()"
            />
            <KButton
              :primary="false"
              appearance="flat-button"
              :text="$tr('resetToDefaultSettings')"
              name="reset-settings"
              @click="showModal = true"
            />
          </KButtonGroup>
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
        :facilityId="facilityId"
        :facilityName="facilityName"
        @submit="sendFacilityName"
        @cancel="showEditFacilityModal = false"
      />

      <CreateManagementPinModal
        v-if="createPinShow"
        @submit="createPinShow = false"
        @cancel="createPinShow = false"
      />

      <ViewPinModal
        v-if="handleViewModal"
        @cancel="handleViewModal = false"
      />
      <ChangePinModal
        v-if="handleChangePinModal"
        @submit="handleChangePinModal = false"
        @cancel="handleChangePinModal = false"
      />

      <RemovePinModal
        v-if="handleRemovePinModal"
        @submit="handleRemovePinModal = false"
        @cancel="handleRemovePinModal = false"
      />
    </KPageContainer>

    <BottomAppBar data-test="bottom-bar">
      <KButtonGroup
        v-if="!isAppContext"
        style="margin-top: 8px"
      >
        <KGrid>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              :primary="false"
              appearance="flat-button"
              :text="$tr('resetToDefaultSettings')"
              name="reset-settings"
              @click="showModal = true"
            />
          </KGridItem>
          <KGridItem
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              :primary="true"
              :class="windowIsSmall ? 'mobile-button' : ''"
              appearance="raised-button"
              :text="coreString('saveChangesAction')"
              name="save-settings"
              :disabled="!settingsHaveChanged"
              @click="saveConfig()"
            />
          </KGridItem>
        </KGrid>
      </KButtonGroup>
    </BottomAppBar>
  </FacilityAppBarPage>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { createTranslator } from 'kolibri/utils/i18n';

  import camelCase from 'lodash/camelCase';
  import isEqual from 'lodash/isEqual';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import urls from 'kolibri/urls';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import ConfirmResetModal from './ConfirmResetModal';
  import EditFacilityNameModal from './EditFacilityNameModal';
  import CreateManagementPinModal from './CreateManagementPinModal';
  import ViewPinModal from './ViewPinModal';
  import ChangePinModal from './ChangePinModal';
  import RemovePinModal from './RemovePinModal';

  /**
   * Using the createTranslator to aid concatenation
   * of strings missed before string freeze. This only a workaround
   */
  const deviceSettingsPageStrings = createTranslator('DeviceSettingsPage', {
    changeLocation: {
      message: 'Change',
      context: 'Label to change primary storage location',
    },
  });
  const pinAuthenticationModalStrings = createTranslator('PinAuthenticationModal', {
    pinPlaceholder: {
      message: 'PIN',
      context: 'Placeholder label for a PIN input',
    },
  });

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
      FacilityAppBarPage,
      ConfirmResetModal,
      EditFacilityNameModal,
      BottomAppBar,
      CreateManagementPinModal,
      ViewPinModal,
      ChangePinModal,
      RemovePinModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { windowIsSmall } = useKResponsiveWindow();
      const { isAppContext, isSuperuser, userIsMultiFacilityAdmin } = useUser();
      return {
        createSnackbar,
        windowIsSmall,
        isAppContext,
        isSuperuser,
        userIsMultiFacilityAdmin,
      };
    },
    data() {
      return {
        showModal: false,
        showEditFacilityModal: false,
        settingsCopy: {},
        createPinShow: false,
        handleViewModal: false,
        handleChangePinModal: false,
        handleRemovePinModal: false,
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
      ...mapGetters(['facilityPageLinks']),
      ...mapGetters('facilityConfig', ['getFacilityDataLoading']),
      settingsList: () => settingsList,
      settingsHaveChanged() {
        return !isEqual(this.settings, this.settingsCopy);
      },
      isPinSet() {
        if (
          this.settings &&
          this.settings['extra_fields'] &&
          this.settings['extra_fields']['pin_code']
        ) {
          return this.settings['extra_fields']['pin_code'];
        } else {
          return null;
        }
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
      dropdownOption() {
        return [
          { label: this.viewPINLabel, value: 'VIEW' },
          { label: this.changePINLabel, value: 'CHANGE' },
          { label: this.coreString('removePinPlacholder'), value: 'REMOVE' },
        ];
      },
      changePINLabel() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return `${deviceSettingsPageStrings.$tr('changeLocation')} ${this.pinPlaceholder}`;
        /* eslint-enable */
      },
      viewPINLabel() {
        return `${this.coreString('viewAction')} ${this.pinPlaceholder}`;
      },
      pinPlaceholder() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return pinAuthenticationModalStrings.$tr('pinPlaceholder');
        /* eslint-enable */
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
      updateSettingValue(settingName, newValue) {
        this.$store.commit('facilityConfig/CONFIG_PAGE_MODIFY_SETTING', {
          name: settingName,
          value: newValue,
        });
        return newValue;
      },
      toggleSetting(settingName) {
        return this.updateSettingValue(settingName, !this.settings[settingName]);
      },
      toggleLearnerLoginPassword() {
        const newValue = this.toggleSetting('learner_can_login_with_no_password');
        if (newValue === true) {
          // If learners do not need passwords to log in, learners (and admins)
          // should not be able to edit passwords for their accounts
          this.updateSettingValue('learner_can_edit_password', false);
        }
      },
      updateSettings(action) {
        this.$store
          .dispatch(action)
          .then(() => {
            this.createSnackbar(this.$tr('saveSuccess'));
            this.copySettings();
          })
          .catch(() => {
            this.createSnackbar(this.$tr('saveFailure'));
            this.$store.commit('facilityConfig/CONFIG_PAGE_UNDO_SETTINGS_CHANGE');
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
      handleCreatePin() {
        this.createPinShow = true;
      },
      handleSelect(option) {
        if (option.value === 'VIEW') {
          this.handleViewModal = true;
        } else if (option.value === 'CHANGE') {
          this.handleChangePinModal = true;
        } else if (option.value === 'REMOVE') {
          this.handleRemovePinModal = true;
        }
      },
    },
    $trs: {
      // These are not going to be picked up by the linter because snake cased versions
      // are used to get the keys to these strings.
      /* eslint-disable kolibri/vue-no-unused-translations */
      learnerCanEditName: {
        message: 'Allow learners to edit their full name',
        context: "Option on 'Facility settings' page.",
      },
      learnerCanEditPassword: {
        message: 'Allow learners to edit their password when signed in',
        context: "Option on 'Facility settings' page.",
      },
      learnerCanEditUsername: {
        message: 'Allow learners to edit their username',
        context: "Option on 'Facility settings' page.",
      },
      learnerCanSignUp: {
        message: 'Allow learners to create accounts',
        context: "Option on 'Facility settings' page.",
      },
      learnerNeedPasswordToLogin: {
        message: 'Require password for learners',
        context: "Option on 'Facility settings' page.",
      },
      showDownloadButtonInLearn: {
        message: "Show 'download' button with resources",
        context: "Option on 'Facility settings' page.\n",
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
      saveFailure: {
        message: 'There was a problem saving your settings',
        context: 'Status report after the facility change operation.',
      },
      saveSuccess: {
        message: 'Facility settings updated',
        context: 'Status report after the facility change operation.',
      },
      pageDescription: {
        message: 'Configure facility settings here.',
        context: 'Interpret as "[You can] configure facility settings here"',
      },
      deviceSettings: {
        message: 'You can also configure device settings',
        context: 'Text link on Facility settings page.',
      },
      pageHeader: {
        message: 'Facility settings',
        context: 'Title of the Facility > Settings page.',
      },
      resetToDefaultSettings: {
        message: 'Reset to defaults',
        context: 'Button that resets the facility to its default settings.',
      },
      documentTitle: {
        message: 'Facility Settings',
        context: 'Title of page where user can configure facility settings.',
      },
      deviceManagementPin: {
        message: 'Device management PIN',
        context: 'The title for the device management PIN',
      },
      deviceManagementDescription: {
        message:
          'This 4-digit PIN allows users to manage content and other settings on learn-only devices',
        context: 'Description for the device management',
      },
      createPinBtn: {
        message: 'Create PIN',
        context: 'Button for the create PIN',
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      optionBtn: {
        message: 'option',
        context: 'Options button for the create PIN page',
      },
      /* eslint-enable kolibri/vue-no-unused-translations */
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

  .mobile-button {
    margin-top: 0;
  }

  .facility-loader {
    display: inline-block;
    margin-bottom: -0.5em; // To align with the text
  }

</style>

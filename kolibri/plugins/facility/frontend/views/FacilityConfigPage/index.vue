<template>

  <FacilityAppBarPage :loading="pageLoading">
    <KPageContainer
      data-test="page-container"
      data-testid="page-container"
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
        <h1>{{ pageHeader$() }}</h1>
        <p>
          {{ pageDescription$() }}
          <KExternalLink
            v-if="isSuperuser && deviceSettingsUrl"
            :text="deviceSettings$()"
            :href="deviceSettingsUrl"
          />
        </p>
      </div>

      <KCircularLoader
        v-if="facilityDataLoading"
        class="facility-loader"
      />
      <template v-else-if="settings !== null">
        <div class="mb">
          <h2>{{ coreString('facilityLabel') }}</h2>
          <p class="current-facility-name">
            {{ coreString('facilityNameWithId', { facilityName: facilityName, id: lastPartId }) }}
            <KButton
              appearance="basic-link"
              :text="coreString('editAction')"
              :disabled="facilityDataLoading"
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
                  setting.key !== 'learner_can_edit_password' &&
                    setting.key !== 'learner_can_login_with_no_password'
                "
              >
                <KCheckbox
                  :key="setting.key"
                  :label="setting.label$()"
                  :checked="settings[setting.key]"
                  @change="toggleSetting(setting.key)"
                />
              </template>
              <template v-else-if="setting.key === 'learner_can_login_with_no_password'">
                <KCheckbox
                  :key="setting.key"
                  :label="learnerNeedPasswordToLogin$()"
                  :checked="!settings['learner_can_login_with_no_password']"
                  @change="toggleSetting('learner_can_login_with_no_password')"
                />
                <KCheckbox
                  :key="setting.key + 'learner_can_edit_password'"
                  :disabled="settings['learner_can_login_with_no_password']"
                  :label="learnerCanEditPassword$()"
                  :checked="settings['learner_can_edit_password']"
                  class="checkbox-password"
                  @change="toggleSetting('learner_can_edit_password')"
                />
              </template>
            </template>
          </div>

          <div></div>
        </div>

        <div class="">
          <h2>{{ deviceManagementPin$() }}</h2>

          <p>{{ deviceManagementDescription$() }}</p>
          <KButton
            v-show="!isPinSet"
            @click="handleCreatePin"
          >
            {{ createPinBtn$() }}
          </KButton>

          <KButton
            v-show="isPinSet"
            hasDropdown
            :text="coreString('optionsLabel')"
          >
            <template #menu>
              <KDropdownMenu
                :options="dropdownOptions"
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
          <KButton
            :primary="true"
            appearance="raised-button"
            class="save-changes-button"
            :text="coreString('saveChangesAction')"
            name="save-settings"
            :disabled="!settingsHaveChanged"
            @click="saveConfig()"
          />
        </div>
      </template>

      <EditFacilityNameModal
        v-if="showEditFacilityModal"
        id="edit-facility"
        :facilityId="facilityId"
        :facilityName="facilityName"
        @submit="submitFacilityName"
        @cancel="showEditFacilityModal = false"
      />

      <CreateManagementPinModal
        v-if="createPinShow"
        @submit="handleCreatePinSubmit"
        @cancel="createPinShow = false"
      />

      <ViewPinModal
        v-if="handleViewModal"
        :pin="isPinSet"
        @cancel="handleViewModal = false"
      />
      <ChangePinModal
        v-if="handleChangePinModal"
        @submit="handleChangePinSubmit"
        @cancel="handleChangePinModal = false"
      />

      <RemovePinModal
        v-if="handleRemovePinModal"
        @submit="handleRemovePinSubmit"
        @cancel="handleRemovePinModal = false"
      />
    </KPageContainer>

    <BottomAppBar data-testid="bottom-bar">
      <KButton
        v-if="!isAppContext"
        :primary="true"
        class="save-button"
        appearance="raised-button"
        :text="coreString('saveChangesAction')"
        name="save-settings"
        :disabled="!settingsHaveChanged"
        @click="saveConfig()"
      />
    </BottomAppBar>
  </FacilityAppBarPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { ref, onMounted, computed } from 'vue';
  import camelCase from 'lodash/camelCase';
  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import urls from 'kolibri/urls';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { createTranslator, currentLanguage } from 'kolibri/utils/i18n';
  import store from 'kolibri/store';
  import { useRoute } from 'vue-router/composables';
  import useFacilityEditor from '../../composables/useFacilityEditor';
  import { pageLoading } from '../../composables/usePageLoading';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import RemovePinModal from './RemovePinModal';
  import ChangePinModal from './ChangePinModal';
  import ViewPinModal from './ViewPinModal';
  import CreateManagementPinModal from './CreateManagementPinModal';
  import EditFacilityNameModal from './EditFacilityNameModal';

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
  const facilityConfigPageStrings = createTranslator('FacilityConfigPage', {
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
    enableMarkAttendance: {
      message: 'Allow coaches to take attendance (English only)',
      context: "Option on 'Facility settings' page.",
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
  });

  // See FacilityDataset in core.auth.models for details
  const settingKeys = [
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
        title: facilityConfigPageStrings.documentTitle$(),
      };
    },
    components: {
      FacilityAppBarPage,
      EditFacilityNameModal,
      BottomAppBar,
      CreateManagementPinModal,
      ViewPinModal,
      ChangePinModal,
      RemovePinModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { showSnackbarNotification } = commonCoreStrings.methods;
      const route = useRoute();
      const { createSnackbar } = useSnackbar();
      const { isAppContext, isSuperuser, userFacilityId } = useUser();
      const { userIsMultiFacilityAdmin } = useFacilities();
      const facilityId = route.params.facility_id || userFacilityId.value;
      const {
        facilityName,
        settings,
        facilityDataLoading,
        settingsHaveChanged,
        isPinSet,
        fetchFacility,
        modifySetting,
        undoSettingsChange,
        saveFacilityName,
        saveFacilityConfig,
        setPin,
        unsetPin,
      } = useFacilityEditor(facilityId);

      const {
        pageHeader$,
        pageDescription$,
        deviceSettings$,
        learnerNeedPasswordToLogin$,
        learnerCanEditPassword$,
        deviceManagementPin$,
        deviceManagementDescription$,
        createPinBtn$,
        saveSuccess$,
        saveFailure$,
      } = facilityConfigPageStrings;

      const { pinPlaceholder$ } = pinAuthenticationModalStrings;
      const { changeLocation$ } = deviceSettingsPageStrings;

      // state
      const showEditFacilityModal = ref(false);
      const createPinShow = ref(false);
      const handleViewModal = ref(false);
      const handleChangePinModal = ref(false);
      const handleRemovePinModal = ref(false);

      // This dynamic templating for these settings will be refactored later
      const _settingKeys = computed(() => {
        return currentLanguage === 'en'
          ? settingKeys.concat('enable_mark_attendance')
          : settingKeys;
      });
      const settingsList = computed(() => {
        return _settingKeys.value.map(key => ({
          key,
          label$: () => facilityConfigPageStrings.$tr(camelCase(key)),
        }));
      });

      // computed
      const deviceSettingsUrl = computed(() => {
        const getUrl = urls['kolibri:kolibri.plugins.device:device_management'];
        if (getUrl) {
          return getUrl() + '#/settings';
        }
        return null;
      });
      const lastPartId = computed(() => {
        return facilityId ? facilityId.slice(0, 4) : '';
      });
      const changePINLabel = computed(() => {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return `${changeLocation$()} ${pinPlaceholder$()}`;
        /* eslint-enable */
      });
      const viewPINLabel = computed(() => {
        return `${coreString('viewAction')} ${pinPlaceholder$()}`;
      });
      const dropdownOptions = computed(() => {
        return [
          { label: viewPINLabel.value, value: 'VIEW' },
          { label: changePINLabel.value, value: 'CHANGE' },
          { label: coreString('removePinPlacholder'), value: 'REMOVE' },
        ];
      });

      // actions
      async function submitFacilityName(name) {
        showEditFacilityModal.value = false;
        if (name !== facilityName.value) {
          try {
            await saveFacilityName(name);
            createSnackbar(coreString('changesSavedNotification'));
          } catch (error) {
            createSnackbar(coreString('changesNotSavedNotification'));
          }
        }
      }

      function toggleSetting(settingName) {
        modifySetting(settingName, !settings.value[settingName]);
      }

      async function saveConfig() {
        try {
          await saveFacilityConfig();
          createSnackbar(saveSuccess$());
        } catch (error) {
          createSnackbar(saveFailure$());
          undoSettingsChange();
        }
      }

      async function handleCreatePinSubmit(payload) {
        try {
          await setPin(payload);
          showSnackbarNotification('pinCreated');
          createPinShow.value = false;
        } catch (error) {
          createSnackbar(saveFailure$());
        }
      }

      async function handleChangePinSubmit(payload) {
        try {
          await setPin(payload);
          showSnackbarNotification('pinUpdated');
          handleChangePinModal.value = false;
        } catch (error) {
          createSnackbar(saveFailure$());
        }
      }

      async function handleRemovePinSubmit() {
        try {
          await unsetPin();
          showSnackbarNotification('pinRemove');
          handleRemovePinModal.value = false;
        } catch (error) {
          createSnackbar(saveFailure$());
        }
      }

      function handleCreatePin() {
        createPinShow.value = true;
      }

      function handleSelect(option) {
        if (option.value === 'VIEW') {
          handleViewModal.value = true;
        } else if (option.value === 'CHANGE') {
          handleChangePinModal.value = true;
        } else if (option.value === 'REMOVE') {
          handleRemovePinModal.value = true;
        }
      }

      onMounted(async () => {
        try {
          await fetchFacility();
        } catch (error) {
          store.dispatch('handleError', { error, reloadOnReconnect: true });
        }
      });

      return {
        pageLoading,
        isAppContext,
        isSuperuser,
        userIsMultiFacilityAdmin,
        facilityName,
        facilityId,
        settings,
        facilityDataLoading,
        settingsHaveChanged,
        isPinSet,
        showEditFacilityModal,
        settingsList,
        createPinShow,
        handleViewModal,
        handleChangePinModal,
        handleRemovePinModal,
        deviceSettingsUrl,
        lastPartId,
        dropdownOptions,

        // Functions
        submitFacilityName,
        toggleSetting,
        saveConfig,
        handleCreatePinSubmit,
        handleChangePinSubmit,
        handleRemovePinSubmit,
        handleCreatePin,
        handleSelect,

        // Strings
        pageHeader$,
        pageDescription$,
        deviceSettings$,
        learnerNeedPasswordToLogin$,
        learnerCanEditPassword$,
        deviceManagementPin$,
        deviceManagementDescription$,
        createPinBtn$,
      };
    },
    computed: {
      ...mapGetters(['facilityPageLinks']),
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

  .save-button {
    position: absolute;
    right: 25px;
  }

  .facility-loader {
    display: inline-block;
    margin-bottom: -0.5em; // To align with the text
  }

  .save-changes-button {
    margin-top: 24px;
    margin-left: -8px;
  }

</style>

<template>

  <FacilityAppBarPage :loading="pageLoading">
    <KPageContainer
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
        <section class="facility-name facility-settings">
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
        </section>

        <!-- Users Section -->
        <section class="facility-settings users">
          <h3>{{ coreString('usersLabel') }}</h3>
          <div class="settings">
            <KCheckbox
              v-model="settings.learner_can_edit_username"
              :label="learnerCanEditUsername$()"
              data-testid="learner_can_edit_username"
            />
            <KCheckbox
              v-model="settings.learner_can_edit_name"
              :label="learnerCanEditName$()"
              data-testid="learner_can_edit_name"
            />
            <KCheckbox
              v-model="settings.learner_can_sign_up"
              :label="learnerCanSignUp$()"
              data-testid="learner_can_sign_up"
            />
            <KCheckbox
              v-if="isAttendanceFeatureEnabled"
              v-model="settings.enable_mark_attendance"
              :label="enableMarkAttendance$()"
              data-testid="enable_mark_attendance"
            />
          </div>
        </section>

        <!-- Resources Section -->
        <section class="facility-settings resources">
          <h3>{{ coreString('resourcesLabel') }}</h3>
          <div class="settings">
            <KCheckbox
              v-model="settings.show_download_button_in_learn"
              :label="showDownloadButtonInLearn$()"
              data-testid="show_download_button_in_learn"
            />
          </div>
        </section>

        <!-- How learners sign in Section -->
        <section class="facility-settings learner-signin">
          <h3>{{ howLearnersSignIn$() }}</h3>
          <div class="settings">
            <KRadioButtonGroup>
              <KRadioButton
                v-model="signInOption"
                :label="enterUsernameAndPassword$()"
                :buttonValue="OptionsForSignIn.USERNAME_PASSWORD"
                :data-testid="OptionsForSignIn.USERNAME_PASSWORD"
              />
              <KCheckbox
                v-if="signInOption === OptionsForSignIn.USERNAME_PASSWORD"
                v-model="settings.learner_can_edit_password"
                :label="learnerCanEditPassword$()"
                class="nested-settings"
                data-testid="learner_can_edit_password"
              />

              <KRadioButton
                v-model="signInOption"
                :label="enterUsernameOnly$()"
                :buttonValue="OptionsForSignIn.USERNAME_ONLY"
                :data-testid="OptionsForSignIn.USERNAME_ONLY"
              />

              <template v-if="isPictureLoginFeatureEnabled">
                <div class="radio-button-and-info-wrapper">
                  <KRadioButton
                    v-model="signInOption"
                    :label="picturePassword$()"
                    :buttonValue="OptionsForSignIn.PICTURE_PASSWORD"
                    :disabled="picturePasswordDisabled"
                    :data-testid="OptionsForSignIn.PICTURE_PASSWORD"
                  />
                  <KIconButton
                    icon="info"
                    size="mini"
                    :color="$themeTokens.primary"
                    :ariaLabel="picturePasswordInfoLabel$()"
                    @click.stop="showPicturePasswordInfoModal = true"
                  />
                </div>
                <div
                  class="radio-description"
                  :style="{
                    color: picturePasswordDisabled
                      ? $themeTokens.textDisabled
                      : $themeTokens.annotation,
                  }"
                >
                  {{ picturePasswordDescription$() }}
                </div>
                <div
                  v-if="picturePasswordDisabled"
                  class="exhausted-explanation nested-settings"
                >
                  <KIcon
                    icon="warning"
                    :style="{ fill: $themePalette.yellow.v_600 }"
                  />
                  <span>{{ picturePasswordUnavailableExplanation$() }}</span>
                  <KIconButton
                    icon="info"
                    size="mini"
                    :color="$themeTokens.primary"
                    :ariaLabel="picturePasswordUnavailableExplanation$()"
                    @click="showPicturePasswordUnavailableModal = true"
                  />
                </div>
              </template>
              <KRadioButtonGroup
                v-if="
                  isPictureLoginFeatureEnabled && signInOption === OptionsForSignIn.PICTURE_PASSWORD
                "
                class="nested-settings picture-password-settings"
                :aria-label="iconStyle$()"
              >
                <div class="radio-button-and-info-wrapper">
                  <KRadioButton
                    v-model="picturePasswordStyle"
                    :label="childFriendlyIcons$()"
                    :buttonValue="PicturePasswordIconStyle.COLORFUL"
                    :disabled="picturePasswordDisabled"
                    data-testid="child_friendly_icons"
                  />
                  <KIconButton
                    icon="info"
                    size="mini"
                    :color="$themeTokens.primary"
                    :ariaLabel="childFriendlyIconsInfoLabel$()"
                    @click.stop="showChildFriendlyIconsModal = true"
                  />
                </div>
                <KRadioButton
                  v-model="picturePasswordStyle"
                  :label="standardIcons$()"
                  :buttonValue="PicturePasswordIconStyle.STANDARD"
                  :disabled="picturePasswordDisabled"
                  data-testid="standard_icons"
                />
                <hr
                  class="divider"
                  :style="dividerStyle"
                >
                <KCheckbox
                  v-model="picturePasswordShowIconText"
                  :label="showIconNames$()"
                  :disabled="picturePasswordDisabled"
                  data-testid="show_icon_text"
                />
              </KRadioButtonGroup>
            </KRadioButtonGroup>
          </div>
        </section>

        <section>
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
        </section>

        <div
          v-if="isAppContext"
          class="save-changes-row"
          :style="{
            marginTop: '32px',
            borderTop: '1px solid',
            borderTopColor: $themeTokens.fineLine,
          }"
        >
          <div class="save-changes-inline-group">
            <KButton
              :primary="true"
              appearance="raised-button"
              class="save-changes-button"
              :text="coreString('saveChangesAction')"
              name="save-settings"
              :disabled="!settingsHaveChanged || pictureLoginTaskLoading"
              @click="saveConfig()"
            />
            <KCircularLoader
              v-if="pictureLoginTaskLoading"
              :size="24"
              data-testid="picture_password_assignment_status"
            />
          </div>
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

      <PicturePasswordInfoModal
        v-if="showPicturePasswordInfoModal"
        @close="showPicturePasswordInfoModal = false"
      />

      <ChildFriendlyIconsModal
        v-if="showChildFriendlyIconsModal"
        @close="showChildFriendlyIconsModal = false"
      />

      <PicturePasswordUnavailableModal
        v-if="showPicturePasswordUnavailableModal"
        :facilityName="facilityName"
        :learnerCount="facilityLearnerCount"
        @close="showPicturePasswordUnavailableModal = false"
      />
    </KPageContainer>

    <BottomAppBar data-testid="bottom-bar">
      <div
        v-if="!isAppContext"
        class="bottom-bar-save-group"
      >
        <KCircularLoader
          v-if="pictureLoginTaskLoading"
          :size="24"
          data-testid="picture_password_assignment_status"
        />
        <KButton
          :primary="true"
          class="save-button"
          appearance="raised-button"
          :text="coreString('saveChangesAction')"
          name="save-settings"
          :disabled="!settingsHaveChanged || pictureLoginTaskLoading"
          @click="saveConfig()"
        />
      </div>
    </BottomAppBar>
  </FacilityAppBarPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { useRoute } from 'vue-router/composables';
  import { ref, onMounted, computed, watch } from 'vue';
  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import urls from 'kolibri/urls';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import useUser from 'kolibri/composables/useUser';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import useTaskPolling from 'kolibri-common/composables/useTaskPolling';
  import { TaskStatuses } from 'kolibri-common/utils/syncTaskUtils';
  import { handleApiError } from 'kolibri/utils/appError';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { createTranslator } from 'kolibri/utils/i18n';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  import { OptionsForSignIn, PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
  import useFacilityEditor from '../../composables/useFacilityEditor';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import RemovePinModal from './RemovePinModal';
  import ChangePinModal from './ChangePinModal';
  import ViewPinModal from './ViewPinModal';
  import CreateManagementPinModal from './CreateManagementPinModal';
  import EditFacilityNameModal from './EditFacilityNameModal';
  import PicturePasswordInfoModal from './PicturePasswordInfoModal';
  import ChildFriendlyIconsModal from './ChildFriendlyIconsModal';
  import PicturePasswordUnavailableModal from './PicturePasswordUnavailableModal';

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
    learnerCanEditUsername: {
      message: 'Allow learners to edit their username',
      context: "Option on 'Facility settings' page.",
    },
    learnerCanEditName: {
      message: 'Allow learners to edit their full name',
      context: "Option on 'Facility settings' page.",
    },
    learnerCanSignUp: {
      message: 'Allow learners to create accounts',
      context: "Option on 'Facility settings' page.",
    },
    learnerCanEditPassword: {
      message: 'Allow learners to edit their password when signed in',
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
      PicturePasswordInfoModal,
      ChildFriendlyIconsModal,
      PicturePasswordUnavailableModal,
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
        facility,
        facilityName,
        settings,
        facilityDataLoading,
        settingsHaveChanged,
        isPinSet,
        isAttendanceFeatureEnabled,
        isPictureLoginFeatureEnabled,
        signInOption,
        picturePasswordStyle,
        picturePasswordShowIconText,
        pictureLoginTaskId,
        fetchFacility,
        undoSettingsChange,
        saveFacilityName,
        saveFacilityConfig,
        saveFacilityLoginSettings,
        setPin,
        unsetPin,
      } = useFacilityEditor(facilityId);

      const {
        pageHeader$,
        pageDescription$,
        deviceSettings$,
        learnerCanEditUsername$,
        learnerCanEditName$,
        learnerCanSignUp$,
        showDownloadButtonInLearn$,
        enableMarkAttendance$,
        learnerCanEditPassword$,
        deviceManagementPin$,
        deviceManagementDescription$,
        createPinBtn$,
        saveSuccess$,
        saveFailure$,
      } = facilityConfigPageStrings;
      const {
        howLearnersSignIn$,
        enterUsernameAndPassword$,
        enterUsernameOnly$,
        picturePassword$,
        picturePasswordInfoLabel$,
        picturePasswordDescription$,
        childFriendlyIcons$,
        childFriendlyIconsInfoLabel$,
        standardIcons$,
        showIconNames$,
        iconStyle$,
        picturePasswordUnavailableExplanation$,
      } = picturePasswordStrings;
      const { pinPlaceholder$ } = pinAuthenticationModalStrings;
      const { changeLocation$ } = deviceSettingsPageStrings;

      // state
      const showEditFacilityModal = ref(false);
      const createPinShow = ref(false);
      const handleViewModal = ref(false);
      const handleChangePinModal = ref(false);
      const handleRemovePinModal = ref(false);
      const showPicturePasswordInfoModal = ref(false);
      const showChildFriendlyIconsModal = ref(false);
      const showPicturePasswordUnavailableModal = ref(false);

      // computed
      const facilityLearnerCount = computed(() => facility.value?.num_learners ?? 0);
      const picturePasswordDisabled = computed(() => !!facility.value?.picture_passwords_exhausted);

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
        return `${changeLocation$()} ${pinPlaceholder$()}`;
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

      async function saveConfig() {
        try {
          pictureLoginTaskLoading.value = true;
          await saveFacilityConfig();
          await saveFacilityLoginSettings();
          if (!pictureLoginTaskId.value) {
            createSnackbar(saveSuccess$());
          }
        } catch (error) {
          createSnackbar(saveFailure$());
          undoSettingsChange();
        } finally {
          if (!pictureLoginTaskId.value) {
            pictureLoginTaskLoading.value = false;
          }
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
          handleApiError({ error, reloadOnReconnect: true, shouldThrow: false });
        }
      });

      const { tasks: facilityTasks } = useTaskPolling('facility_task');
      const pictureLoginTaskLoading = ref(false);

      const pictureLoginTask = computed(() => {
        if (!pictureLoginTaskId.value) return null;
        return facilityTasks.value.find(t => t.id === pictureLoginTaskId.value) || null;
      });

      watch(pictureLoginTask, task => {
        if (!task) return;
        if (task.status === TaskStatuses.FAILED) {
          pictureLoginTaskLoading.value = false;
          pictureLoginTaskId.value = null;
          createSnackbar(saveFailure$());
        } else if (task.status === TaskStatuses.COMPLETED) {
          pictureLoginTaskLoading.value = false;
          pictureLoginTaskId.value = null;
          createSnackbar(saveSuccess$());
        }
      });

      return {
        // Constants
        OptionsForSignIn,
        PicturePasswordIconStyle,

        // State
        isAppContext,
        pageLoading,
        isSuperuser,
        userIsMultiFacilityAdmin,
        facilityName,
        facilityId,
        settings,
        facilityDataLoading,
        settingsHaveChanged,
        isPinSet,
        showEditFacilityModal,
        createPinShow,
        handleViewModal,
        handleChangePinModal,
        handleRemovePinModal,
        showPicturePasswordInfoModal,
        showChildFriendlyIconsModal,
        showPicturePasswordUnavailableModal,
        deviceSettingsUrl,
        lastPartId,
        dropdownOptions,
        isAttendanceFeatureEnabled,
        isPictureLoginFeatureEnabled,
        signInOption,
        picturePasswordStyle,
        picturePasswordShowIconText,
        pictureLoginTaskLoading,
        picturePasswordDisabled,
        facilityLearnerCount,

        // Functions
        submitFacilityName,
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
        learnerCanEditUsername$,
        learnerCanEditName$,
        learnerCanSignUp$,
        enableMarkAttendance$,
        learnerCanEditPassword$,
        showDownloadButtonInLearn$,
        deviceManagementPin$,
        deviceManagementDescription$,
        createPinBtn$,
        howLearnersSignIn$,
        enterUsernameAndPassword$,
        enterUsernameOnly$,
        picturePassword$,
        picturePasswordInfoLabel$,
        picturePasswordDescription$,
        childFriendlyIcons$,
        childFriendlyIconsInfoLabel$,
        standardIcons$,
        showIconNames$,
        iconStyle$,
        picturePasswordUnavailableExplanation$,
      };
    },
    computed: {
      ...mapGetters(['facilityPageLinks']),
      dividerStyle() {
        return `color : ${this.$themeTokens.fineLine}`;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-settings {
    margin-bottom: 20px;
  }

  .facility-settings > h3 {
    margin: 8px 0;
  }

  .settings > label {
    margin-bottom: 2rem;
    font-weight: bold;
    cursor: pointer;
  }

  .save-button {
    flex: 0 0 auto;
  }

  .facility-loader {
    display: inline-block;
    margin-bottom: -0.5em; // To align with the text
  }

  .save-changes-row {
    display: flex;
  }

  .save-changes-inline-group,
  .bottom-bar-save-group {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .save-changes-inline-group {
    margin-top: 24px;
  }

  .save-changes-button {
    flex: 0 0 auto;
    margin-top: 0;
    margin-left: 0;
  }

  .nested-settings {
    // radio button width: 24px,
    // label left padding: 8px,
    // adjustment: -1px (slight left padding on checkbox)
    margin-left: #{24px + 8px - 1px};
  }

  .picture-password-settings {
    margin-top: 12px;
  }

  .divider {
    border-style: solid;
  }

  .radio-button-and-info-wrapper {
    display: flex;
    align-items: center;

    /deep/ .k-radio-button-container {
      width: auto;
    }
  }

  .radio-description {
    margin-inline-start: 32px;
    margin-top: -4px;
    font-size: 12px;
    line-height: normal;
  }

  .exhausted-explanation {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-top: 4px;
  }

</style>

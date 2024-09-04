<template>

  <DeviceAppBarPage :title="pageTitle">
    <KPageContainer
      v-if="!isPageLoading"
      class="device-container"
    >
      <UiAlert
        v-if="showDisabledAlert && alertDismissed"
        type="warning"
        @dismiss="alertDismissed = false"
      >
        {{ disabledAlertText }}
      </UiAlert>
      <section>
        <h1>
          {{ $tr('pageHeader') }}
        </h1>
        <p>
          {{ $tr('pageDescription') }}
          <KExternalLink
            v-if="!isLearnerOnlyImport && !isMultiFacilitySuperuser && getFacilitySettingsPath()"
            :text="$tr('facilitySettings')"
            :href="getFacilitySettingsPath()"
          />
        </p>
      </section>

      <section>
        <div class="fieldset">
          <KSelect
            v-model="language"
            :label="$tr('selectedLanguageLabel')"
            :options="languageOptions"
            :disabled="language.value === undefined"
            :floatingLabel="false"
            style="max-width: 300px"
          />
        </div>

        <div class="fieldset">
          <label class="fieldset-label">{{ $tr('externalDeviceSettings') }}</label>
          <KCheckbox
            :label="$tr('unlistedChannels')"
            :checked="allowPeerUnlistedChannelImport"
            @change="allowPeerUnlistedChannelImport = $event"
          />
          <KCheckbox
            v-if="isAppContext"
            :checked="allowOtherBrowsersToConnect"
            @change="allowOtherBrowsersToConnect = $event"
          >
            <span>
              {{ $tr('allowExternalConnectionsApp') }}
              <p
                v-if="allowOtherBrowsersToConnect"
                class="description"
                :style="{ color: $themeTokens.annotation }"
              >
                {{ $tr('allowExternalConnectionsAppDescription') }}
              </p>
            </span>
          </KCheckbox>
        </div>

        <div class="fieldset">
          <label class="fieldset-label">{{ $tr('landingPageLabel') }}</label>
          <KRadioButtonGroup>
            <KRadioButton
              data-test="landingPageButton"
              :label="$tr('learnerAppPageChoice')"
              :buttonValue="landingPageChoices.LEARN"
              :currentValue="landingPage"
              @input="handleLandingPageChange"
            />
            <KRadioButton
              data-test="signInPageButton"
              :label="$tr('signInPageChoice')"
              :buttonValue="landingPageChoices.SIGN_IN"
              :currentValue="landingPage"
              @input="handleLandingPageChange"
            />

            <div
              class="fieldset"
              style="margin-left: 32px"
            >
              <KRadioButton
                data-test="allowGuestAccessButton"
                :label="$tr('allowGuestAccess')"
                :buttonValue="SignInPageOptions.ALLOW_GUEST_ACCESS"
                :currentValue="signInPageOption"
                :disabled="disableSignInPageOptions"
                @input="handleSignInPageChange"
              />
              <KRadioButton
                data-test="disallowGuestAccessButton"
                :label="$tr('disallowGuestAccess')"
                :buttonValue="SignInPageOptions.DISALLOW_GUEST_ACCESS"
                :currentValue="signInPageOption"
                :disabled="disableSignInPageOptions"
                @input="handleSignInPageChange"
              />
              <KRadioButton
                data-test="lockedContentButton"
                :label="$tr('lockedContent')"
                :buttonValue="SignInPageOptions.LOCKED_CONTENT"
                :currentValue="signInPageOption"
                :disabled="disableSignInPageOptions"
                @input="handleSignInPageChange"
              />
            </div>
          </KRadioButtonGroup>
        </div>

        <div
          v-if="canCheckMeteredConnection"
          class="fieldset"
        >
          <h2>
            <label>{{ $tr('allowDownloadOnMeteredConnection') }}</label>
          </h2>
          <p :class="InfoDescriptionColor">
            {{ $tr('DownloadOnMeteredConnectionDescription') }}
          </p>
          <KRadioButtonGroup>
            <KRadioButton
              :label="$tr('doNotAllowDownload')"
              :buttonValue="
                meteredConnectionDownloadOptions.DISALLOW_DOWNLOAD_ON_METERED_CONNECTION
              "
              :currentValue="meteredConnectionDownloadOption"
              @input="handleMeteredConnectionDownloadChange"
            />
            <KRadioButton
              :label="$tr('allowDownload')"
              :buttonValue="meteredConnectionDownloadOptions.ALLOW_DOWNLOAD_ON_METERED_CONNECTION"
              :currentValue="meteredConnectionDownloadOption"
              @input="handleMeteredConnectionDownloadChange"
            />
          </KRadioButtonGroup>
        </div>

        <div>
          <h2>
            {{ $tr('primaryStorage') }}
          </h2>
          <p :class="InfoDescriptionColor">
            {{ $tr('primaryStorageDescription') }}
          </p>
          <p>
            {{ primaryStorageLocation }}
            <KButton
              v-show="secondaryStorageLocations.length >= 1"
              :text="$tr('changeLocation')"
              :primary="true"
              appearance="basic-link"
              :disabled="!multipleWritablePaths || isRemoteContent || !canRestart"
              :class="{ disabled: !multipleWritablePaths }"
              @click="showChangePrimaryLocationModal = true"
            />
          </p>
          <KButton
            v-if="secondaryStorageLocations.length === 0"
            :text="$tr('addLocation')"
            :disabled="isRemoteContent || !canRestart"
            appearance="raised-button"
            secondary
            @click="showAddStorageLocationModal = true"
          />
        </div>

        <div v-show="secondaryStorageLocations.length > 0">
          <h2>
            {{ $tr('secondaryStorage') }}
          </h2>
          <p
            v-show="multipleReadOnlyPaths"
            :class="InfoDescriptionColor"
          >
            {{ $tr('secondaryStorageDescription') }}
          </p>
          <p
            v-for="path in secondaryStorageLocations"
            :key="path.index"
          >
            {{ path }} {{ isWritablePath(path) }}
          </p>
          <KButton
            hasDropdown
            secondary
            appearance="raised-button"
            :disabled="isRemoteContent || !canRestart"
            :text="coreString('optionsLabel')"
          >
            <template #menu>
              <KDropdownMenu
                :options="storageLocationOptions"
                @select="handleSelect($event)"
              />
            </template>
          </KButton>
        </div>

        <div class="fieldset">
          <h2>
            <label>{{ $tr('autoDownload') }}</label>
          </h2>
          <KCheckbox
            :label="$tr('enableAutoDownload')"
            :checked="enableAutomaticDownload"
            :description="$tr('enableAutoDownloadDescription')"
            @change="handleCheckAutodownload('enableAutomaticDownload', $event)"
          />
          <div class="fieldset left-margin">
            <KCheckbox
              :label="$tr('allowLearnersDownloadResources')"
              :checked="allowLearnerDownloadResources"
              :description="$tr('allowLearnersDownloadDescription')"
              @change="handleCheckAutodownload('allowLearnerDownloadResources', $event)"
            />
            <KCheckbox
              :label="$tr('setStorageLimit')"
              :checked="setLimitForAutodownload"
              :description="$tr('setStorageLimitDescription')"
              @change="handleCheckAutodownload('setLimitForAutodownload', $event)"
            />
            <div
              v-show="setLimitForAutodownload"
              class="left-margin limit-for-autodownload"
              :class="$computedClass(limitForAutodownloadStyle)"
              :disabled="isRemoteContent"
            >
              <KTextbox
                ref="autoDownloadLimit"
                v-model="limitForAutodownloadInput"
                class="download-limit-textbox"
                :disabled="notEnoughFreeSpace || isRemoteContent"
                type="number"
                :label="$tr('sizeInGigabytesLabel')"
                :min="0"
                :max="toGigabytes(freeSpace)"
                :invalid="notEnoughFreeSpace"
                :invalidText="$tr('notEnoughFreeSpace')"
                :floatingLabel="false"
                @input="updateLimitForAutodownload"
              />
              <div
                class="slider-section"
                :class="$computedClass(sliderSectionStyle)"
              >
                <p class="slider-min-max">0</p>
                <input
                  id="slider"
                  v-model="limitForAutodownload"
                  :class="$computedClass(sliderStyle)"
                  :disabled="notEnoughFreeSpace || isRemoteContent"
                  type="range"
                  min="0"
                  :max="freeSpace"
                  step="1"
                  @input="updateLimitForAutodownloadInput"
                >
                <p class="slider-min-max">
                  {{ toGigabytes(freeSpace) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="fieldset">
          <h2>
            {{ $tr('enabledPages') }}
          </h2>
          <p :class="InfoDescriptionColor">
            {{ deviceString('newEnabledPluginsState') }}
          </p>

          <KCheckbox
            v-for="plugin in dataPlugins"
            :key="plugin.id"
            :label="plugin.name"
            :checked="plugin.enabled"
            :disabled="!canRestart"
            @change="plugin.enabled = $event"
          />
        </div>
      </section>

      <!-- List of separate links to Facility Settings pages -->
      <section v-if="isMultiFacilitySuperuser">
        <h2>{{ $tr('configureFacilitySettingsHeader') }}</h2>
        <ul class="ul-reset">
          <template>
            <li
              v-for="(facility, idx) in facilities"
              :key="idx"
            >
              <KExternalLink
                :text="facility.name"
                :href="getFacilitySettingsPath(facility.id)"
                icon="facility"
              />
            </li>
          </template>
        </ul>
      </section>

      <section
        v-if="isAppContext"
        class="android-bar"
      >
        <KButton
          :text="coreString('saveChangesAction')"
          appearance="raised-button"
          primary
          data-test="saveButtonAndroid"
          @click="handleClickSave"
        />
      </section>
      <BottomAppBar v-else>
        <KButtonGroup>
          <KButton
            :text="coreString('saveChangesAction')"
            appearance="raised-button"
            primary
            data-test="saveButton"
            @click="handleClickSave"
          />
        </KButtonGroup>
      </BottomAppBar>

      <PrimaryStorageLocationModal
        v-if="showChangePrimaryLocationModal"
        :primaryPath="primaryStorageLocation"
        :storageLocations="storageLocations.filter(el => el.writable)"
        @cancel="showChangePrimaryLocationModal = false"
        @submit="changePrimaryLocation"
      />

      <AddStorageLocationModal
        v-if="showAddStorageLocationModal"
        :paths="storageLocations"
        @cancel="showAddStorageLocationModal = false"
        @submit="addStorageLocation"
      />

      <RemoveStorageLocationModal
        v-if="showRemoveStorageLocationModal"
        :storageLocations="secondaryStorageLocations"
        @cancel="showRemoveStorageLocationModal = false"
        @submit="removeStorageLocation"
      />

      <ServerRestartModal
        v-if="showRestartModal"
        :path="restartPath"
        :changedSetting="restartSetting"
        @cancel="showRestartModal = false"
        @submit="handleServerRestart"
      />

      <ServerRestartModal
        v-if="restarting"
        :restarting="true"
      />
    </KPageContainer>
  </DeviceAppBarPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import find from 'lodash/find';
  import urls from 'kolibri.urls';
  import logger from 'kolibri.lib.logging';
  import { ref, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { availableLanguages, currentLanguage, sortLanguages } from 'kolibri.utils.i18n';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { checkCapability } from 'kolibri.utils.appCapabilities';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import commonDeviceStrings from '../commonDeviceStrings';
  import DeviceAppBarPage from '../DeviceAppBarPage';
  import { LandingPageChoices, MeteredConnectionDownloadOptions } from '../../constants';
  import { getFreeSpaceOnServer } from '../AvailableChannelsPage/api';
  import useDeviceRestart from '../../composables/useDeviceRestart';
  import usePlugins from '../../composables/usePlugins';
  import { getDeviceSettings, getPathsPermissions, saveDeviceSettings, getDeviceURLs } from './api';
  import PrimaryStorageLocationModal from './PrimaryStorageLocationModal';
  import AddStorageLocationModal from './AddStorageLocationModal';
  import RemoveStorageLocationModal from './RemoveStorageLocationModal';
  import ServerRestartModal from './ServerRestartModal';

  const logging = logger.getLogger(__filename);

  const SignInPageOptions = Object.freeze({
    LOCKED_CONTENT: 'LOCKED_CONTENT',
    DISALLOW_GUEST_ACCESS: 'DISALLOW_GUEST_ACCESS',
    ALLOW_GUEST_ACCESS: 'ALLOW_GUEST_ACCESS',
  });

  export default {
    name: 'DeviceSettingsPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader'),
      };
    },
    components: {
      DeviceAppBarPage,
      BottomAppBar,
      PrimaryStorageLocationModal,
      AddStorageLocationModal,
      RemoveStorageLocationModal,
      ServerRestartModal,
      UiAlert,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    setup() {
      const { isAppContext, isLearnerOnlyImport, isSuperuser } = useUser();
      const { canRestart, restart, restarting } = useDeviceRestart();
      const { plugins, fetchPlugins, togglePlugin } = usePlugins();
      const { windowIsSmall } = useKResponsiveWindow();
      const dataPlugins = ref(null);
      const { snackbarIsVisible, createSnackbar } = useSnackbar();

      fetchPlugins.then(() => {
        dataPlugins.value = plugins.value.map(plugin => ({ ...plugin }));
      });

      function checkAndTogglePlugins() {
        dataPlugins.value.forEach((plugin, index) => {
          if (plugin.enabled !== plugins.value[index].enabled) {
            togglePlugin(plugin.id, plugin.enabled);
          }
        });
      }

      function checkPluginChanges() {
        // returns true if any of the plugins have changed its
        // enabled state
        const unchanged = dataPlugins.value.every((plugin, index) => {
          if (plugin.enabled !== plugins.value[index].enabled) {
            return false;
          }
          return true;
        });
        return !unchanged;
      }

      return {
        isAppContext,
        isLearnerOnlyImport,
        isSuperuser,
        canRestart,
        restart,
        restarting,
        dataPlugins,
        checkPluginChanges,
        checkAndTogglePlugins,
        windowIsSmall,
        snackbarIsVisible,
        createSnackbar,
      };
    },
    data() {
      return {
        language: {},
        landingPage: '',
        allowPeerUnlistedChannelImport: null,
        allowOtherBrowsersToConnect: null,
        landingPageChoices: LandingPageChoices,
        signInPageOption: '',
        SignInPageOptions,
        extraSettings: {},
        meteredConnectionDownloadOption: '',
        meteredConnectionDownloadOptions: MeteredConnectionDownloadOptions,
        primaryStorageLocation: null,
        secondaryStorageLocations: [],
        storageLocations: {},
        enableAutomaticDownload: null,
        allowLearnerDownloadResources: null,
        setLimitForAutodownload: null,
        limitForAutodownload: '0',
        freeSpace: null,
        deviceUrls: [],
        showChangePrimaryLocationModal: false,
        showAddStorageLocationModal: false,
        showRemoveStorageLocationModal: false,
        browserDefaultOption: {
          value: null,
          label: this.$tr('browserDefaultLanguage'),
        },
        restartPath: {},
        restartSetting: null,
        showRestartModal: false,
        writablePaths: 0,
        readOnlyPaths: 0,
        alertDismissed: true,
      };
    },
    computed: {
      ...mapGetters(['isPageLoading']),
      ...mapGetters('deviceInfo', ['isRemoteContent']),
      InfoDescriptionColor() {
        return {
          color: this.$themePalette.grey.v_600,
        };
      },
      pageTitle() {
        return this.deviceString('deviceManagementTitle');
      },
      facilities() {
        return this.$store.getters.facilities;
      },
      isMultiFacilitySuperuser() {
        return this.isSuperuser && this.facilities.length > 1;
      },
      languageOptions() {
        const languages = sortLanguages(Object.values(availableLanguages), currentLanguage).map(
          language => {
            return {
              value: language.id,
              label: language.lang_name,
            };
          },
        );
        languages.splice(1, 0, this.browserDefaultOption);

        return languages;
      },
      disableSignInPageOptions() {
        return this.landingPage !== LandingPageChoices.SIGN_IN;
      },
      storageLocationOptions() {
        return [this.$tr('addStorageLocation'), this.$tr('removeStorageLocation')];
      },
      notEnoughFreeSpace() {
        return this.freeSpace === 0;
      },
      multipleWritablePaths() {
        Object.values(this.storageLocations).forEach(el => {
          if (el.writable === true) this.writablePaths += 1;
        });
        return this.writablePaths >= 2;
      },
      multipleReadOnlyPaths() {
        Object.values(this.storageLocations).forEach(el => {
          if (el.writable === false) this.readOnlyPaths += 1;
        });
        return this.readOnlyPaths >= 1;
      },
      limitForAutodownloadStyle() {
        const alignItems = this.windowIsSmall ? 'start' : 'center';
        const flexDirection = this.windowIsSmall ? 'column' : 'row';
        return {
          alignItems,
          flexDirection,
        };
      },
      sliderSectionStyle() {
        const paddingLeft = this.windowIsSmall ? '0px' : '20px';
        return {
          paddingLeft,
        };
      },
      sliderStyle() {
        const width = this.windowIsSmall ? '35vw' : '12vw';
        if (this.notEnoughFreeSpace) {
          return {
            background: `linear-gradient(to right, ${this.$themeTokens.primary} 0%, ${
              this.$themeTokens.primary
            }
            ${((0 - 0) / (100 - 0)) * 100}%, ${this.$themeTokens.fineLine} ${
              ((0 - 0) / (100 - 0)) * 100
            }%, ${this.$themeTokens.fineLine} 100%)`,
            '::-webkit-slider-thumb': {
              background: this.$themeTokens.fineLine,
            },
            width,
          };
        } else {
          return {
            background: `linear-gradient(to right, ${this.$themeTokens.primary} 0%, ${
              this.$themeTokens.primary
            }
            ${((this.limitForAutodownload - 0) / (this.freeSpace - 0)) * 100}%,
            ${this.$themeTokens.fineLine} ${
              ((this.limitForAutodownload - 0) / (this.freeSpace - 0)) * 100
            }%, ${this.$themeTokens.fineLine} 100%)`,
            '::-webkit-slider-thumb': {
              background: this.$themeTokens.primary,
            },
            width,
          };
        }
      },
      canCheckMeteredConnection() {
        return checkCapability('check_is_metered');
      },
      showDisabledAlert() {
        return this.isRemoteContent || !this.canRestart;
      },
      disabledAlertText() {
        if (!this.canRestart && this.isRemoteContent) {
          return this.$tr('alertDisabledOptions');
        }
        if (!this.canRestart) {
          return this.$tr('alertDisabledPlugins');
        }
        if (this.isRemoteContent) {
          return this.$tr('alertDisabledPaths');
        }
        return this.$tr('alertDisabledOptions');
      },
      limitForAutodownloadInput: {
        get() {
          return this.toGigabytes(this.limitForAutodownload);
        },
        set(value) {
          this.limitForAutodownload = this.toBytes(value);
        },
      },
    },
    created() {
      this.setDeviceURLs();
      if (this.freeSpace === null) this.setFreeSpace();
    },
    beforeMount() {
      this.getDeviceSettings()
        .then(settings => {
          const {
            languageId = null,
            landingPage = '',
            allowGuestAccess = false,
            allowLearnerUnassignedResourceAccess = false,
            allowPeerUnlistedChannelImport = null,
            allowOtherBrowsersToConnect = null,
            primaryStorageLocation = null,
            secondaryStorageLocations = [],
            extraSettings = {},
          } = settings;
          const match = find(this.languageOptions, { value: languageId });
          if (match) {
            this.language = { ...match };
          } else {
            this.language = this.browserDefaultOption;
          }

          if (settings.landingPage === LandingPageChoices.SIGN_IN) {
            this.setSignInPageOption(settings);
          }

          this.setExtraSettings(extraSettings);

          Object.assign(this, {
            landingPage,
            allowGuestAccess,
            allowLearnerUnassignedResourceAccess,
            allowPeerUnlistedChannelImport,
            allowOtherBrowsersToConnect,
            primaryStorageLocation,
            secondaryStorageLocations,
            extraSettings,
          });
          this.storageLocations = getPathsPermissions([
            ...this.secondaryStorageLocations,
            this.primaryStorageLocation,
          ]);
        })
        .then(() => this.$store.dispatch('notLoading'));
    },
    methods: {
      setSignInPageOption(settings) {
        if (settings.allowLearnerUnassignedResourceAccess === false) {
          this.signInPageOption = SignInPageOptions.LOCKED_CONTENT;
        } else if (settings.allowGuestAccess === true) {
          this.signInPageOption = SignInPageOptions.ALLOW_GUEST_ACCESS;
        } else if (settings.allowGuestAccess === false) {
          this.signInPageOption = SignInPageOptions.DISALLOW_GUEST_ACCESS;
        }
      },
      setExtraSettings(extraSettings) {
        // Destructuring the object
        const {
          allow_download_on_metered_connection = false,
          allow_learner_download_resources = false,
          enable_automatic_download = true,
          limit_for_autodownload = 0,
          set_limit_for_autodownload = false,
        } = extraSettings;

        if (allow_download_on_metered_connection === false) {
          this.meteredConnectionDownloadOption =
            MeteredConnectionDownloadOptions.DISALLOW_DOWNLOAD_ON_METERED_CONNECTION;
        } else {
          this.meteredConnectionDownloadOption =
            MeteredConnectionDownloadOptions.ALLOW_DOWNLOAD_ON_METERED_CONNECTION;
        }
        this.allowLearnerDownloadResources = allow_learner_download_resources;
        this.enableAutomaticDownload = enable_automatic_download;
        if (set_limit_for_autodownload === false) {
          if (this.freeSpace === null) {
            this.setFreeSpace().then(() => {
              this.limitForAutodownload = parseInt(this.freeSpace * 0.8).toString();
            });
          } else {
            this.limitForAutodownload = parseInt(this.freeSpace * 0.8).toString();
          }
        } else {
          this.limitForAutodownload = limit_for_autodownload.toString();
        }
        this.setLimitForAutodownload = set_limit_for_autodownload;
      },
      getContentSettings() {
        // This is the inverse of 'setSignInPageOption'
        // NOTE: See screenshot in #7247 for how radio button selection should map to settings
        if (
          this.landingPage === LandingPageChoices.LEARN ||
          this.signInPageOption === SignInPageOptions.ALLOW_GUEST_ACCESS
        ) {
          return {
            allowGuestAccess: true,
            allowLearnerUnassignedResourceAccess: true,
          };
        } else if (this.signInPageOption === SignInPageOptions.DISALLOW_GUEST_ACCESS) {
          return {
            allowGuestAccess: false,
            allowLearnerUnassignedResourceAccess: true,
          };
        } else if (this.signInPageOption === SignInPageOptions.LOCKED_CONTENT) {
          return {
            allowGuestAccess: false,
            allowLearnerUnassignedResourceAccess: false,
          };
        }
      },
      getExtraSettings() {
        const newExtraSettings = {
          allow_download_on_metered_connection:
            this.meteredConnectionDownloadOption ===
            MeteredConnectionDownloadOptions.DISALLOW_DOWNLOAD_ON_METERED_CONNECTION
              ? false
              : true,
          allow_learner_download_resources:
            this.enableAutomaticDownload === false ? false : this.allowLearnerDownloadResources,
          enable_automatic_download: this.enableAutomaticDownload,
          limit_for_autodownload:
            this.notEnoughFreeSpace || this.setLimitForAutodownload === false
              ? 0
              : parseInt(this.limitForAutodownload),
          set_limit_for_autodownload:
            this.enableAutomaticDownload === false || this.notEnoughFreeSpace
              ? false
              : this.setLimitForAutodownload,
        };
        Object.assign(this.extraSettings, newExtraSettings);
      },
      setDeviceURLs() {
        return getDeviceURLs().then(({ deviceUrls }) => {
          this.deviceUrls = deviceUrls;
        });
      },
      setFreeSpace() {
        return getFreeSpaceOnServer().then(({ freeSpace }) => {
          this.freeSpace = freeSpace;
        });
      },
      handleLandingPageChange(option) {
        this.landingPage = option;
        if (option === LandingPageChoices.LEARN) {
          this.signInPageOption = '';
        } else {
          this.signInPageOption = SignInPageOptions.ALLOW_GUEST_ACCESS;
        }
      },
      handleSignInPageChange(option) {
        this.signInPageOption = option;
      },
      handleMeteredConnectionDownloadChange(option) {
        this.meteredConnectionDownloadOption = option;
      },
      getFacilitySettingsPath(facilityId = '') {
        const getUrl = urls['kolibri:kolibri.plugins.facility:facility_management'];
        if (getUrl) {
          if (facilityId) {
            return getUrl() + `#/${facilityId}/settings`;
          }
          return getUrl() + '#/settings';
        }
        return '';
      },
      handleCheckAutodownload(option, value) {
        switch (option) {
          case 'enableAutomaticDownload':
            this.enableAutomaticDownload = value;
            if (!value) {
              this.allowLearnerDownloadResources = false;
              this.setLimitForAutodownload = false;
            }
            break;
          case 'allowLearnerDownloadResources':
            this.allowLearnerDownloadResources = value;
            break;
          case 'setLimitForAutodownload':
            this.setLimitForAutodownload = value;
            break;
        }
        this.enableAutomaticDownload =
          this.enableAutomaticDownload ||
          this.allowLearnerDownloadResources ||
          this.setLimitForAutodownload;
      },
      handleClickSave() {
        const restartPlugins = this.checkPluginChanges();
        if (restartPlugins) {
          this.restartSetting = 'plugin';
          this.showRestartModal = true;
        } else {
          this.restartSetting = null;
          this.handleSave();
        }
      },
      handleSave() {
        const { allowGuestAccess, allowLearnerUnassignedResourceAccess } =
          this.getContentSettings();
        this.getExtraSettings();

        const pluginsChanged = this.checkPluginChanges();

        this.checkAndTogglePlugins();

        this.saveDeviceSettings({
          languageId: this.language.value,
          landingPage: this.landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport: this.allowPeerUnlistedChannelImport,
          allowOtherBrowsersToConnect: this.allowOtherBrowsersToConnect,
          extraSettings: this.extraSettings,
          secondaryStorageLocations: this.secondaryStorageLocations,
          primaryStorageLocation: this.primaryStorageLocation,
        })
          .then(didSave => {
            didSave = didSave || pluginsChanged;
            if (didSave) {
              this.createSnackbar({
                text: this.$tr('saveSuccessNotification'),
                autoDismiss: true,
                duration: 2000,
              });
              this.showRestartModal = false;
              if (this.canRestart && this.restartSetting !== null) {
                this.restartSetting = null;
                return this.restart().then(() => didSave);
              }
            }
            return didSave;
          })
          .then(shouldReload => {
            if (shouldReload) {
              if (this.snackbarIsVisible) {
                const unwatch = watch(this.snackbarIsVisible, () => {
                  unwatch && unwatch();
                  window.location.reload();
                });
              } else {
                window.location.reload();
              }
            }
          })
          .catch(err => {
            logging.error(err);
            this.createSnackbar(this.$tr('saveFailureNotification'));
          });
      },
      getDeviceSettings,
      saveDeviceSettings,
      handleSelect(selectedOption) {
        if (selectedOption === this.$tr('addStorageLocation')) {
          this.showAddStorageLocationModal = true;
          this.showRemoveStorageLocationModal = false;
        } else if (selectedOption === this.$tr('removeStorageLocation')) {
          this.showRemoveStorageLocationModal = true;
          this.showAddStorageLocationModal = false;
        }
      },
      changePrimaryLocation(path) {
        const writable = true;
        this.restartPath = {
          path,
          writable,
        };
        this.restartSetting = 'primary';
        this.showRestartModal = true;
        this.showChangePrimaryLocationModal = false;
      },
      addStorageLocation(path, writable) {
        this.restartPath = {
          path,
          writable,
        };

        this.restartSetting = 'add';
        this.showRestartModal = true;
        this.showAddStorageLocationModal = false;
      },
      removeStorageLocation(path, writable) {
        this.restartPath = {
          path,
          writable,
        };

        this.restartSetting = 'remove';
        this.showRestartModal = true;
        this.showRemoveStorageLocationModal = false;
      },
      handleServerRestart(confirmationChecked) {
        this.showRestartModal = false;
        switch (this.restartSetting) {
          case 'plugin':
            this.handleSave();
            break;
          case 'primary':
            this.secondaryStorageLocations.push(this.primaryStorageLocation);
            this.secondaryStorageLocations = this.secondaryStorageLocations.filter(
              el => el !== this.restartPath.path,
            );
            this.primaryStorageLocation = this.restartPath.path;
            this.handleSave();
            break;
          case 'add':
            this.storageLocations.push(this.restartPath);
            if (confirmationChecked === true) {
              this.secondaryStorageLocations.push(this.primaryStorageLocation);
              this.secondaryStorageLocations = this.secondaryStorageLocations.filter(
                el => el !== this.restartPath.path,
              );
              this.primaryStorageLocation = this.restartPath.path;
            } else {
              this.secondaryStorageLocations.push(this.restartPath.path);
            }
            this.handleSave();
            break;
          case 'remove':
            this.storageLocations = this.storageLocations.filter(
              el => el.path !== this.restartPath.path,
            );
            this.secondaryStorageLocations = this.secondaryStorageLocations.filter(
              el => el !== this.restartPath.path,
            );
            this.handleSave();
            break;
        }
      },
      isWritablePath(path) {
        const found = this.storageLocations.find(el => el.path === path);
        if (found !== undefined && !found.writable) {
          return this.$tr('readOnly');
        }
        return '';
      },
      updateLimitForAutodownload() {
        this.limitForAutodownload = this.toBytes(this.limitForAutodownloadInput);
      },
      updateLimitForAutodownloadInput() {
        this.limitForAutodownloadInput = this.toGigabytes(this.limitForAutodownload);
      },
      toBytes(gigabytes) {
        return parseInt(Math.round(gigabytes * 10 ** 9));
      },
      toGigabytes(bytes) {
        return parseInt(Math.round(bytes / 10 ** 9));
      },
    },
    $trs: {
      browserDefaultLanguage: {
        message: 'Browser default',
        context:
          "Indicates that the language used for the device will be the same as the default language of the user's browser.",
      },
      pageDescription: {
        message: 'The changes you make here will affect this device only.',
        context: "Description on 'Device settings' page.",
      },
      pageHeader: {
        message: 'Device settings',
        context: 'Title of page where user can configure device settings.',
      },
      saveFailureNotification: {
        message: 'Settings have not been updated',
        context: 'Error message that displays if device settings are not saved correctly.',
      },
      saveSuccessNotification: {
        message: 'Settings have been updated',
        context: 'Notification that displays if device settings have been saved correctly.\n',
      },
      selectedLanguageLabel: {
        message: 'Default language',
        context: 'Option that allows user to set the default language of the device.',
      },
      facilitySettings: {
        message: 'You can also configure facility settings',
        context:
          "Text link on the 'Device settings' page that links to the 'Facility settings' page. It is used when there is only one facility on device.",
      },
      allowGuestAccess: {
        message: 'Allow users to explore resources without signing in',
        context: "Option on the 'Device settings' page.",
      },
      disallowGuestAccess: {
        message: 'Learners must sign in to explore resources',
        context: "Option on 'Device Settings' page.",
      },
      lockedContent: {
        message: 'Signed in learners should only see resources assigned to them in classes',
        context: "Option on the 'Device settings' page.",
      },
      landingPageLabel: {
        message: 'Default landing page',
        context:
          "This option allows the admin to configure the default landing page for learners to be either the 'Sign-in' page or the 'Learn' page.",
      },
      signInPageChoice: {
        message: 'Sign-in page',
        context: 'Refers to an option to set the default Kolibri landing page.',
      },
      learnerAppPageChoice: {
        message: 'Learn page',
        context: 'This refers to the page you reach when you click "Learn" in the main side nav.',
      },
      unlistedChannels: {
        message: 'Allow other devices on this network to view and import my unlisted channels',
        context: "Option on 'Device settings' page.",
      },
      configureFacilitySettingsHeader: {
        message: 'Configure facility settings',
        context:
          "Option on 'Device settings' page to switch to the 'Facility settings' page. Will display a list of facilities if user manages more than one facility.",
      },
      allowExternalConnectionsApp: {
        message: 'Allow others in the network to access Kolibri on this device using a browser',
        context:
          'Description of a device setting option. This option is visible only When Kolibri runs on an Android app',
      },
      allowExternalConnectionsAppDescription: {
        message:
          'If learners are allowed to sign in with no password on this device, enabling this may allow external devices to view the user data, which could be a potential security concern.',

        context:
          'Warns the user of the potential security risk if this setting is enabled together with users accesing without password',
      },
      externalDeviceSettings: {
        message: 'External devices',
        context: 'Label for device settings controlling how Kolibri interacts with other devices.',
      },
      allowDownloadOnMeteredConnection: {
        message: 'Download on mobile connection',
        context:
          'Label for device setting that allows user to determine whether or not to download data on mobile connections',
      },
      DownloadOnMeteredConnectionDescription: {
        message:
          'If users on this device are using Kolibri with a limited data plan, they may have to pay extra charges on a mobile connection.',
        context:
          'Warns the user of potential extra charges if using Kolibri with a limited data plan.',
      },
      doNotAllowDownload: {
        message: 'Do not allow download on a mobile connection',
        context: 'Option to not allow downloads on mobile connections.',
      },
      allowDownload: {
        message: 'Allow download on a mobile connection',
        context: 'Option to allow downloads on mobile connections.',
      },
      primaryStorage: {
        message: 'Primary storage location',
        context: 'Option to allow downloads on mobile connections.',
      },
      primaryStorageDescription: {
        message:
          'Kolibri channels are stored here. Newly downloaded resources will be added to this location.',
        context: 'Informs user of storage location for Kolibri channels and new resources',
      },
      secondaryStorage: {
        message: 'Other storage locations',
        context: 'Secondary storage paths for users to store downloaded resources',
      },
      secondaryStorageDescription: {
        message:
          'Kolibri will display channels stored in these locations. Read-only locations cannot be the primary storage location.',
        context: 'Informs user of limits for read-only locations',
      },
      autoDownload: {
        message: 'Auto-download',
        context: 'Label for Auto-download section',
      },
      enableAutoDownload: {
        message: 'Enable auto-download',
        context: "Option on 'Device settings' page.",
      },
      enableAutoDownloadDescription: {
        message:
          "Kolibri will automatically download assigned lessons, quizzes, and other resources on the 'My downloads' list.",
        context: 'Enable auto download description.',
      },
      allowLearnersDownloadResources: {
        message: 'Allow learners to download resources',
        context: "Option on 'Device settings' page.",
      },
      allowLearnersDownloadDescription: {
        message:
          "Allow users to explore resources they don't have, and mark them for Kolibri to automatically download when available in their network.",
        context:
          "Description for 'Allow learners to download resources' option under 'Auto-download' section.",
      },
      setStorageLimit: {
        message: 'Set storage limit for auto-download and learner-initiated downloads',
        context: "Option on 'Device settings' page.",
      },
      sizeInGigabytesLabel: {
        message: 'GB',
        context:
          'Indicates the gigabyte unit of digital information when referring to the storage space available on a device.\n\nSee https://en.wikipedia.org/wiki/Gigabyte',
      },
      setStorageLimitDescription: {
        message:
          'Kolibri will not auto-download more than a set amount of remaining storage on the device',
        context: "Description for 'Set storage limit' option under 'Auto-download' section.",
      },
      addStorageLocation: {
        message: 'Add storage location',
        context: 'Menu option for storage paths',
      },
      removeStorageLocation: {
        message: 'Remove storage location',
        context: 'Menu option for storage paths',
      },
      addLocation: {
        message: 'Add location',
        context: 'Label for a button used to add storage location',
      },
      changeLocation: {
        message: 'Change',
        context: 'Label to change primary storage location',
      },
      notEnoughFreeSpace: {
        message: 'No available storage',
        context: 'Error text that is provided if there is not enough free storage on device',
      },
      readOnly: {
        message: '(read-only)',
        context: 'Label for read-only storage locations',
      },
      enabledPages: {
        message: 'Enabled pages',
        context: 'Label for enabled pages section',
      },
      alertDisabledOptions: {
        message: 'Some configuration options are disabled due to the way Kolibri has been set up.',
        context: 'Alert text that is provided if some options are disabled',
      },
      alertDisabledPaths: {
        message: 'This Kolibri is not set up to manage its own resource files locally.',
        context: 'Alert text that is provided if some storage locations are disabled',
      },
      alertDisabledPlugins: {
        message:
          'This Kolibri is not able to initiate a restart from the user interface - management of the enabled pages will have to happen from the command line, and Kolibri will have to be restarted manually.',
        context: 'Alert text that is provided if some plugins are disabled',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .save-button {
    margin-left: 0;
  }

  .description {
    width: 100%;
    font-size: 12px;
    line-height: normal;
  }

  .ul-reset {
    padding: 0;
    margin: 0;
    list-style: none;

    li {
      margin-bottom: 8px;
    }
  }

  // TODO replace div.fieldset with a real fieldset after styling issue is resolved
  .fieldset {
    margin: 16px 0;
  }

  .fieldset-label {
    font-size: 15px;
    // to match label in KSelect
    color: rgba(0, 0, 0, 0.54);
  }

  .left-margin {
    margin-left: 32px;
  }

  .limit-for-autodownload {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  input[type='range'] {
    width: 12vw;
    height: 2px;
    margin-left: 10px;
    appearance: none;
    outline: none;
  }

  input[type='range']::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    appearance: none;
    cursor: pointer;
    border-radius: 10px;
  }

  .download-limit-textbox {
    width: 70px;
  }

  .slider-section {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding-left: 20px;
  }

  .slider-min-max {
    margin-top: 5px;
    font-size: 14px;
    font-weight: 400;
    color: #686868;
  }

  .disabled {
    color: #e0e0e0 !important;
    pointer-events: none;
  }

  .android-bar {
    padding-top: 10px;
    border-top: 1px solid rgb(222, 222, 222);
  }

  /deep/ .ui-alert--type-warning .ui-alert__body {
    background-color: rgba(255, 253, 231, 1) !important;
  }

</style>

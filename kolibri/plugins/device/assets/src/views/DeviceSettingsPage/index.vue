<template>

  <AppBarPage :title="pageTitle">

    <template #subNav>
      <DeviceTopNav />
    </template>
    <KPageContainer class="device-container">

      <section>
        <h1>
          {{ $tr('pageHeader') }}
        </h1>
        <p>
          {{ $tr('pageDescription') }}
          <KExternalLink
            v-if="!isMultiFacilitySuperuser && getFacilitySettingsPath()"
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
            <span> {{ $tr('allowExternalConnectionsApp') }}
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
          <KRadioButton
            :label="$tr('learnerAppPageChoice')"
            :value="landingPageChoices.LEARN"
            :currentValue="landingPage"
            @input="handleLandingPageChange"
          />
          <KRadioButton
            :label="$tr('signInPageChoice')"
            :value="landingPageChoices.SIGN_IN"
            :currentValue="landingPage"
            @input="handleLandingPageChange"
          />
          <div class="fieldset" style="margin-left: 32px">
            <KRadioButton
              :label="$tr('allowGuestAccess')"
              :value="SignInPageOptions.ALLOW_GUEST_ACCESS"
              :currentValue="signInPageOption"
              :disabled="disableSignInPageOptions"
              @input="handleSignInPageChange"
            />
            <KRadioButton
              :label="$tr('disallowGuestAccess')"
              :value="SignInPageOptions.DISALLOW_GUEST_ACCESS"
              :currentValue="signInPageOption"
              :disabled="disableSignInPageOptions"
              @input="handleSignInPageChange"
            />
            <KRadioButton
              :label="$tr('lockedContent')"
              :value="SignInPageOptions.LOCKED_CONTENT"
              :currentValue="signInPageOption"
              :disabled="disableSignInPageOptions"
              @input="handleSignInPageChange"
            />
          </div>
        </div>

        <div class="fieldset">
          <h2>
            <label>{{ $tr('allowDownloadOnMeteredConnection') }}</label>
          </h2>
          <p class="info-description">
            {{ $tr('DownloadOnMeteredConnectionDescription') }}
          </p>
          <KRadioButton
            :label="$tr('doNotAllowDownload')"
            :value="meteredConnectionDownloadOptions.DISALLOW_DOWNLOAD_ON_METERED_CONNECTION"
            :currentValue="meteredConnectionDownloadOption"
            @input="handleMeteredConnectionDownloadChange"
          />
          <KRadioButton
            :label="$tr('allowDownload')"
            :value="meteredConnectionDownloadOptions.ALLOW_DOWNLOAD_ON_METERED_CONNECTION"
            :currentValue="meteredConnectionDownloadOption"
            @input="handleMeteredConnectionDownloadChange"
          />
        </div>

        <div>
          <h2>
            {{ $tr('primaryStorage') }}
          </h2>
          <p class="info-description">
            {{ $tr('primaryStorageDescription') }}
          </p>
          <p>
            {{ primaryStorageLocation }}
            <KExternalLink v-if="browserLocationMatchesServerURL" text="Change" href="#0" />
          </p>
          <KButton
            v-if="browserLocationMatchesServerURL"
            :text="$tr('addLocation')"
            appearance="raised-button"
            secondary
            @click="handleClick"
          />
        </div>

        <div v-if="browserLocationMatchesServerURL">
          <h2>
            {{ $tr('secondaryStorage') }}
          </h2>
          <p class="info-description">
            {{ $tr('secondaryStorageDescription') }}
          </p>
          <p v-for="path in secondaryStorageConnections" :key="path.index">
            {{ path }}
          </p>
          <KButton
            hasDropdown
            secondary
            appearance="raised-button"
            :text="coreString('optionsLabel')"
          >
            <template #menu>
              <KDropdownMenu :options="storageLocationOptions" @select="handleClick" />
            </template>
          </KButton>
        </div>

        <div class="fieldset">
          <h2>
            <label>{{ $tr('autoDownload') }}</label>
          </h2>
          <KCheckbox
            :label="$tr('enableAutoDownload')"
            :checked="enableAutomaticDownload ||
              allowLearnerDownloadResources ||
              setLimitForAutodownload"
            :description="$tr('enableAutoDownloadDescription')"
            @change="enableAutomaticDownload = $event"
          />
          <div class="fieldset left-margin">
            <KCheckbox
              :label="$tr('allowLearnersDownloadResources')"
              :checked="enableAutomaticDownload === false ? false : allowLearnerDownloadResources"
              :description="$tr('allowLearnersDownloadDescription')"
              @change="allowLearnerDownloadResources = $event"
            />
            <KCheckbox
              :label="$tr('setStorageLimit')"
              :checked="enableAutomaticDownload === false ? false : setLimitForAutodownload"
              :description="$tr('setStorageLimitDescription')"
              @change="setLimitForAutodownload = $event"
            />
            <div v-show="setLimitForAutodownload" class="left-margin">
              <KTextbox
                ref="autoDownloadLimit"
                v-model="limitForAutodownload"
                class="download-limit-textbox"
                :disabled="notEnoughFreeSpace"
                type="number"
                label="GB"
                :invalid="notEnoughFreeSpace"
                :invalidText="$tr('notEnoughFreeSpace')"
              />
              <div class="slider-section">
                <input
                  id="slider"
                  v-model="limitForAutodownload"
                  :class="$computedClass(sliderStyle)"
                  :disabled="notEnoughFreeSpace"
                  type="range"
                  min="0"
                  :max="freeSpace"
                  step="1"
                >
                <div class="slider-constraints">
                  <p class="slider-min-max">
                    0
                  </p>
                  <p class="slider-min-max">
                    {{ freeSpace }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <KButton
          :text="coreString('saveChangesAction')"
          appearance="raised-button"
          primary
          @click="handleClickSave"
        />
      </section>

      <!-- List of separate links to Facility Settings pages -->
      <section v-if="isMultiFacilitySuperuser">
        <h2>{{ $tr('configureFacilitySettingsHeader') }}</h2>
        <ul class="ul-reset">
          <template v-for="(facility, idx) in facilities">
            <li :key="idx">
              <KExternalLink
                :text="facility.name"
                :href="getFacilitySettingsPath(facility.id)"
                icon="facility"
              />
            </li>
          </template>
        </ul>
      </section>

    </KPageContainer>
  </AppBarPage>

</template>


<script>

  import { mapGetters } from 'vuex';
  import find from 'lodash/find';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import sortLanguages from 'kolibri.utils.sortLanguages';
  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { LandingPageChoices, MeteredConnectionDownloadOptions } from '../../constants';
  import DeviceTopNav from '../DeviceTopNav';
  import { deviceString } from '../commonDeviceStrings';
  import { getFreeSpaceOnServer } from '../AvailableChannelsPage/api';
  import { getDeviceSettings, saveDeviceSettings, getDeviceURLs } from './api';

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
    components: { AppBarPage, DeviceTopNav },
    mixins: [commonCoreStrings],
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
        secondaryStorageConnections: null,
        enableAutomaticDownload: null,
        allowLearnerDownloadResources: null,
        setLimitForAutodownload: null,
        limitForAutodownload: 0,
        freeSpace: 0,
        deviceUrls: [],
        browserDefaultOption: {
          value: null,
          label: this.$tr('browserDefaultLanguage'),
        },
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
      pageTitle() {
        return deviceString('deviceManagementTitle');
      },
      facilities() {
        return this.$store.getters.facilities;
      },
      isMultiFacilitySuperuser() {
        return this.$store.getters.isSuperuser && this.facilities.length > 1;
      },
      languageOptions() {
        let languages = sortLanguages(Object.values(availableLanguages), currentLanguage).map(
          language => {
            return {
              value: language.id,
              label: language.lang_name,
            };
          }
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
      browserLocationMatchesServerURL() {
        return (
          window.location.hostname.includes('127.0.0.1') ||
          window.location.hostname.includes('localhost')
        );
      },
      notEnoughFreeSpace() {
        return this.freeSpace === 0;
      },
      sliderStyle() {
        if (this.notEnoughFreeSpace) {
          return {
            background: `linear-gradient(to right, ${this.$themeTokens.primary} 0%, ${
              this.$themeTokens.primary
            }
            ${((0 - 0) / (100 - 0)) * 100}%, ${this.$themeTokens.fineLine} ${((0 - 0) / (100 - 0)) *
              100}%, ${this.$themeTokens.fineLine} 100%)`,
            '::-webkit-slider-thumb': {
              background: this.$themeTokens.fineLine,
            },
          };
        } else {
          return {
            background: `linear-gradient(to right, ${this.$themeTokens.primary} 0%, ${
              this.$themeTokens.primary
            }
            ${((this.limitForAutodownload - 0) / (this.freeSpace - 0)) * 100}%,
            ${this.$themeTokens.fineLine} ${((this.limitForAutodownload - 0) /
              (this.freeSpace - 0)) *
              100}%, ${this.$themeTokens.fineLine} 100%)`,
            '::-webkit-slider-thumb': {
              background: this.$themeTokens.primary,
            },
          };
        }
      },
    },
    created() {
      this.setDeviceURLs();
      this.setFreeSpace();
    },
    beforeMount() {
      this.getDeviceSettings().then(settings => {
        const {
          languageId,
          landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport,
          allowOtherBrowsersToConnect,
          extraSettings,
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

        this.setExtraSettings(settings);

        Object.assign(this, {
          landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport,
          allowOtherBrowsersToConnect,
          extraSettings,
        });
      });
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
      setExtraSettings(settings) {
        // Destructuring the object
        const {
          allow_download_on_mettered_connection,
          allow_learner_download_resources,
          enable_automatic_download,
          limit_for_autodownload,
          primary_storage_connection,
          secondary_storage_connections,
          set_limit_for_autodownload,
        } = settings.extraSettings;

        if (allow_download_on_mettered_connection === false) {
          this.meteredConnectionDownloadOption =
            MeteredConnectionDownloadOptions.DISALLOW_DOWNLOAD_ON_METERED_CONNECTION;
        } else {
          this.meteredConnectionDownloadOption =
            MeteredConnectionDownloadOptions.ALLOW_DOWNLOAD_ON_METERED_CONNECTION;
        }
        this.allowLearnerDownloadResources = allow_learner_download_resources;
        this.enableAutomaticDownload = enable_automatic_download;
        this.limitForAutodownload = limit_for_autodownload;
        this.primaryStorageLocation = primary_storage_connection;
        this.secondaryStorageConnections = secondary_storage_connections;
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
          allow_download_on_mettered_connection:
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
          primary_storage_connection: this.primaryStorageLocation,
          secondary_storage_connections: this.secondaryStorageConnections,
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
          this.freeSpace = parseInt(bytesForHumans(freeSpace).substring(0, 3));
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
      handleClickSave() {
        const {
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
        } = this.getContentSettings();

        this.getExtraSettings();

        this.saveDeviceSettings({
          languageId: this.language.value,
          landingPage: this.landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport: this.allowPeerUnlistedChannelImport,
          allowOtherBrowsersToConnect: this.allowOtherBrowsersToConnect,
          extraSettings: this.extraSettings,
        })
          .then(() => {
            this.$store.dispatch('createSnackbar', this.$tr('saveSuccessNotification'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.$tr('saveFailureNotification'));
          });
      },
      getDeviceSettings,
      saveDeviceSettings,
      handleClick(e) {
        e.preventDefault();
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
        message: 'Allow other computers on this network to import my unlisted channels',
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
        message: 'Download on metered connection',
        context:
          'Label for device setting that allows user to determine whether or not to download data on metered connections',
      },
      DownloadOnMeteredConnectionDescription: {
        message:
          'If users on this device are using Kolibri with a limited data plan, they may have to pay extra charges on a metered connection.',
        context:
          'Warns the user of potential extra charges if using Kolibri with a limited data plan.',
      },
      doNotAllowDownload: {
        message: 'Do not allow download on a metered connection',
        context: 'Option to not allow downloads on metered connections.',
      },
      allowDownload: {
        message: 'Allow download on a metered connection',
        context: 'Option to allow downloads on metered connections.',
      },
      primaryStorage: {
        message: 'Primary storage location',
        context: 'Option to allow downloads on metered connections.',
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
        message: 'Read-only locations cannot be the primary storage location.',
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
          "Allow users to explore resources they don't have and mark it for Kolibri to automatically download when it's available in their network.",
        context:
          "Description for 'Allow learners to download resources' option under 'Auto-download' section.",
      },
      setStorageLimit: {
        message: 'Set storage limit for auto-download and learner-initiated downloads',
        context: "Option on 'Device settings' page.",
      },
      setStorageLimitDescription: {
        message:
          'Kolibri will not auto-download more than a set amount of remaining storage on the device',
        context: "Description for 'Set storage limit' option under 'Auto-download' section.",
      },
      addStorageLocation: {
        message: 'Add storage location ',
        context: 'Menu option for storage paths',
      },
      removeStorageLocation: {
        message: 'Remove storage location',
        context: 'Menu option for storage paths',
      },
      addLocation: {
        message: 'Add Location',
        context: 'Label for a button used to add storage location',
      },
      notEnoughFreeSpace: {
        message: 'No available storage',
        context: 'Error text that is provided if there is not enough free storage on device',
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

  .info-description {
    color: #616161;
  }

  input[type='range'] {
    width: 264px;
    height: 2px;
    margin-left: 10px;
    outline: none;
    appearance: none;
  }

  input[type='range']::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    cursor: pointer;
    border-radius: 10px;
    appearance: none;
  }

  .download-limit-textbox {
    display: inline-block;
    width: 70px;
  }

  .slider-section {
    position: absolute;
    display: inline-block;
    padding-top: 10px;
  }

  .slider-constraints {
    display: flex;
    justify-content: space-between;
    margin-left: 10px;
  }

  .slider-min-max {
    display: inline-block;
    margin-top: 5px;
    font-size: 14px;
    font-weight: 400;
    color: #686868;
  }

</style>

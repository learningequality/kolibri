<template>

  <div>
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
    </section>

    <section>
      <KButton
        :text="coreString('saveAction')"
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
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import find from 'lodash/find';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import sortLanguages from 'kolibri.utils.sortLanguages';
  import { LandingPageChoices } from '../../constants';
  import { getDeviceSettings, saveDeviceSettings } from './api';

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
        browserDefaultOption: {
          value: null,
          label: this.$tr('browserDefaultLanguage'),
        },
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
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

        Object.assign(this, {
          landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport,
          allowOtherBrowsersToConnect,
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
      getContentSettings() {
        // This is the inverse of 'setSignInPageOption'
        // NOTE: See screenshot in #7247 for how radio button selection should map to settings
        if (this.landingPage === LandingPageChoices.LEARN) {
          return {
            allowGuestAccess: false,
            allowLearnerUnassignedResourceAccess: true,
          };
        }

        if (this.signInPageOption === SignInPageOptions.ALLOW_GUEST_ACCESS) {
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

        this.saveDeviceSettings({
          languageId: this.language.value,
          landingPage: this.landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport: this.allowPeerUnlistedChannelImport,
          allowOtherBrowsersToConnect: this.allowOtherBrowsersToConnect,
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
    },
    $trs: {
      browserDefaultLanguage: 'Browser default',
      pageDescription: 'The changes you make here will affect this device only.',
      pageHeader: 'Device settings',
      saveFailureNotification: 'Settings have not been updated',
      saveSuccessNotification: 'Settings have been updated',
      selectedLanguageLabel: 'Default language',
      facilitySettings: 'You can also configure facility settings',
      allowGuestAccess: 'Allow users to explore resources without signing in',
      disallowGuestAccess: 'Learners must sign in to explore resources',
      lockedContent: 'Signed in learners should only see resources assigned to them in classes',
      landingPageLabel: {
        message: 'Default landing page',
        context: 'The page that users see immediately after they log in',
      },
      signInPageChoice: 'Sign-in page',
      learnerAppPageChoice: {
        message: 'Learn page',
        context: '\nThis refers to the page you reach when you click "Learn" in the main side nav',
      },
      unlistedChannels: 'Allow other computers on this network to import my unlisted channels',
      configureFacilitySettingsHeader: 'Configure facility settings',
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
        context: 'Label for settings controlling how Kolibri interacts with other devices',
      },
    },
  };

</script>


<style lang="scss" scoped>

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

  .fieldset {
    margin: 16px 0;
  }

  .fieldset-label {
    font-size: 15px;
    // to match label in KSelect
    color: rgba(0, 0, 0, 0.54);
  }

</style>

<template>

  <div>
    <section>
      <h1>
        {{ $tr('pageHeader') }}
      </h1>
      <p>
        {{ $tr('pageDescription') }}
        <KExternalLink
          v-if="facilitySettingsUrl"
          :text="$tr('facilitySettings')"
          :href="facilitySettingsUrl"
        />
      </p>
    </section>

    <section>
      <UiAlert
        v-if="saveStatus === 'SUCCESS'"
        type="success"
        @dismiss="resetSaveStatus"
      >
        {{ $tr('saveSuccessNotification') }}
      </UiAlert>
      <UiAlert
        v-if="saveStatus === 'ERROR'"
        type="error"
        @dismiss="resetSaveStatus"
      >
        {{ $tr('saveFailureNotification') }}
      </UiAlert>
    </section>
    <section>
      <KSelect
        v-model="language"
        :label="$tr('selectedLanguageLabel')"
        :options="languageOptions"
        :disabled="language.value === undefined"
        :floatingLabel="false"
        style="max-width: 300px"
      />
      <KCheckbox
        :label="$tr('unlistedChannels')"
        :checked="allowPeerUnlistedChannelImport"
        @change="allowPeerUnlistedChannelImport = $event"
      />
      <p>
        <label>{{ $tr('landingPageLabel') }}</label>
        <KRadioButton
          :label="$tr('signInPageChoice')"
          :value="landingPageChoices.SIGN_IN"
          :currentValue="landingPage"
          @change="landingPage = landingPageChoices.SIGN_IN"
        />
        <KRadioButton
          :label="$tr('learnerAppPageChoice')"
          :value="landingPageChoices.LEARN"
          :currentValue="landingPage"
          @change="landingPage = landingPageChoices.LEARN"
        />
      </p>
      <KCheckbox
        :label="$tr('allowGuestAccess')"
        :disabled="disableAllowGuestAccess"
        :checked="allowGuestAccess || landingPage === landingPageChoices.LEARN"
        @change="allowGuestAccess = $event"
      />
      <KCheckbox
        :label="$tr('lockedContent')"
        :disabled="disableAllowLearnerUnassignedResourceAccess"
        :checked="!allowLearnerUnassignedResourceAccess && landingPage !== landingPageChoices.LEARN"
        @change="allowLearnerUnassignedResourceAccess = !$event"
      />
    </section>
    <section>
      <KButton
        class="save-button"
        :text="coreString('saveAction')"
        appearance="raised-button"
        primary
        @click="handleClickSave"
      />
    </section>
  </div>

</template>


<script>

  import mapValues from 'lodash/map';
  import find from 'lodash/find';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { availableLanguages } from 'kolibri.utils.i18n';
  import { LandingPageChoices } from '../../constants';
  import { getDeviceSettings, saveDeviceSettings } from './api';

  export default {
    name: 'DeviceSettingsPage',
    metaInfo() {
      return {
        title: this.$tr('pageHeader'),
      };
    },
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        language: {},
        landingPage: '',
        allowGuestAccess: null,
        allowLearnerUnassignedResourceAccess: null,
        allowPeerUnlistedChannelImport: null,

        saveStatus: null,
        landingPageChoices: LandingPageChoices,
        browserDefaultOption: {
          value: null,
          label: this.$tr('browserDefaultLanguage'),
        },
      };
    },
    computed: {
      languageOptions() {
        return [
          this.browserDefaultOption,
          ...mapValues(availableLanguages, language => {
            return {
              value: language.id,
              label: language.lang_name,
            };
          }),
        ];
      },
      facilitySettingsUrl() {
        const getUrl = urls['kolibri:kolibri.plugins.facility:facility_management'];
        if (getUrl) {
          return getUrl() + '#/settings';
        }
        return null;
      },
      disableAllowGuestAccess() {
        return (
          this.landingPage !== LandingPageChoices.SIGN_IN ||
          !this.allowLearnerUnassignedResourceAccess
        );
      },
      disableAllowLearnerUnassignedResourceAccess() {
        return this.landingPage !== LandingPageChoices.SIGN_IN || this.allowGuestAccess;
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
        } = settings;

        const match = find(this.languageOptions, { value: languageId });
        if (match) {
          this.language = { ...match };
        } else {
          this.language = this.browserDefaultOption;
        }

        Object.assign(this, {
          landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport,
        });
      });
    },
    methods: {
      resetSaveStatus() {
        this.saveStatus = null;
      },
      handleClickSave() {
        const {
          language,
          landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport,
        } = this;

        this.resetSaveStatus();
        this.saveDeviceSettings({
          languageId: language.value,
          landingPage,
          allowGuestAccess,
          allowLearnerUnassignedResourceAccess,
          allowPeerUnlistedChannelImport,
        })
          .then(() => {
            this.saveStatus = 'SUCCESS';
          })
          .catch(() => {
            this.saveStatus = 'ERROR';
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
      allowGuestAccess: 'Allow users to access resources without signing in',
      landingPageLabel: 'Landing page',
      signInPageChoice: 'Sign-in page',
      learnerAppPageChoice: {
        message: 'Learn page',
        context: '\nThis refers to the page you reach when you click "Learn" in the main side nav',
      },
      unlistedChannels: 'Allow other computers on this network to import my unlisted channels',
      lockedContent: 'Learners should only see resources assigned to them in classes',
    },
  };

</script>


<style lang="scss" scoped>

  .save-button {
    margin-left: 0;
  }

</style>

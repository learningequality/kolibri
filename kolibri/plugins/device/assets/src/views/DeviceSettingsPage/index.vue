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
      <p>
        <label>{{ $tr('landingPageLabel') }}</label>
        <KRadioButton
          :label="$tr('signInPageChoice')"
          :value="true"
        />
        <KRadioButton
          :label="$tr('learnerAppPageChoice')"
          :value="false"
        />
      </p>
      <KCheckbox :label="$tr('allowGuestAccess')" />
      <KCheckbox :label="$tr('lockedContent')" />
      <KCheckbox :label="$tr('unlistedChannels')" />
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
  import { getDeviceLanguageSetting, saveDeviceLanguageSetting } from './api';

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
        saveStatus: null,
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
    },
    beforeMount() {
      this.getDeviceLanguageSetting().then(languageId => {
        const match = find(this.languageOptions, { value: languageId });
        if (match) {
          this.language = { ...match };
        } else {
          this.language = this.browserDefaultOption;
        }
      });
    },
    methods: {
      resetSaveStatus() {
        this.saveStatus = null;
      },
      handleClickSave() {
        this.resetSaveStatus();
        this.saveDeviceLanguageSetting(this.language.value)
          .then(() => {
            this.saveStatus = 'SUCCESS';
          })
          .catch(() => {
            this.saveStatus = 'ERROR';
          });
      },
      getDeviceLanguageSetting,
      saveDeviceLanguageSetting,
    },
    $trs: {
      browserDefaultLanguage: 'Browser default',
      pageDescription: 'The changes you make here will affect this device only.',
      pageHeader: 'Device settings',
      saveFailureNotification: 'Settings have not been updated',
      saveSuccessNotification: 'Settings have been updated',
      selectedLanguageLabel: 'Default language',
      facilitySettings: 'You can also configure facility settings',
      allowGuestAccess: 'Allow users to access content without signing in',
      landingPageLabel: 'Landing page',
      signInPageChoice: 'Sign-in page',
      learnerAppPageChoice: 'Learn page',
      unlistedChannels: 'Allow other computers on this network to import my unlisted channels',
      lockedContent: 'Learners should only see content assigned to them in classes',
    },
  };

</script>


<style lang="scss" scoped>

  .save-button {
    margin-left: 0;
  }

</style>

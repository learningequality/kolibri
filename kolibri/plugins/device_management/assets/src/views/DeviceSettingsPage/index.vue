<template>

  <div>
    <section>
      <h1>
        {{ $tr('pageHeader') }}
      </h1>
      <p>
        {{ $tr('pageDescription') }}
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
      <h3>
        {{ $tr('defaultLanguageHeader') }}
      </h3>
      <KSelect
        v-model="language"
        :label="$tr('selectedLanguageLabel')"
        :options="languageOptions"
        :disabled="language.value === undefined"
        :floatingLabel="false"
        style="max-width: 300px"
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
  import KButton from 'kolibri.coreVue.components.KButton';
  import KSelect from 'kolibri.coreVue.components.KSelect';
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
      KButton,
      KSelect,
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
      defaultLanguageHeader: 'Default language',
      pageDescription: 'The changes you make here will affect this device only.',
      pageHeader: 'Device settings',
      saveFailureNotification: 'Settings have not been updated',
      saveSuccessNotification: 'Settings have been updated',
      selectedLanguageLabel: 'Selected',
    },
  };

</script>


<style lang="scss" scoped>

  .save-button {
    margin-left: 0;
  }

</style>

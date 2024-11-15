<template>

  <KModal
    v-if="displayMeteredConnectionWarning"
    :title="$tr('modalTitle')"
    :submitText="coreString('continueAction')"
    :submitDisabled="loading"
    @submit="submit"
  >
    <div>
      <p>
        {{ $tr('modalDescription') }}
      </p>
      <KRadioButtonGroup>
        <KRadioButton
          v-model="selected"
          :label="$tr('doNotUseMetered')"
          :buttonValue="Options.DO_NOT_USE_METERED"
          :disabled="loading"
          class="radio-button"
        />
        <KRadioButton
          v-model="selected"
          :label="$tr('useMetered')"
          :buttonValue="Options.USE_METERED"
          :disabled="loading"
          class="radio-button"
        />
      </KRadioButtonGroup>
    </div>
  </KModal>

</template>


<script>

  import urls from 'kolibri/urls';
  import client from 'kolibri/client';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import appCapabilities, { checkCapability } from 'kolibri/utils/appCapabilities';
  import logger from 'kolibri-logging';
  import useUser from 'kolibri/composables/useUser';

  const logging = logger.getLogger(__filename);

  const Options = Object.freeze({
    DO_NOT_USE_METERED: 'DO_NOT_USE_METERED',
    USE_METERED: 'USE_METERED',
  });

  const meteredNetworkModalDismissedKey = 'METERED_NETWORK_MODAL_DISMISSED';

  export default {
    name: 'MeteredConnectionNotificationModal',
    mixins: [commonCoreStrings],
    setup() {
      const { isSuperuser } = useUser();
      return { isSuperuser };
    },
    data() {
      return {
        Options,
        selected: Options.DO_NOT_USE_METERED,
        loading: false,
        activeConnectionIsMetered: false,
        extra_settings: {},
        dismissed: Boolean(window.sessionStorage.getItem(meteredNetworkModalDismissedKey)),
      };
    },
    computed: {
      displayMeteredConnectionWarning() {
        return (
          this.originalSettingDisallows &&
          this.activeConnectionIsMetered &&
          this.isSuperuser &&
          !this.dismissed
        );
      },
      settingsUrl() {
        return urls['kolibri:core:devicesettings']();
      },
      originalSettingDisallows() {
        return !this.extra_settings.allow_download_on_metered_connection;
      },
    },
    mounted() {
      if (checkCapability('check_is_metered')) {
        this.loading = true;

        appCapabilities.checkIsMetered().then(isMetered => {
          this.activeConnectionIsMetered = isMetered;

          // Fetch the DeviceSettings#extra_settings value
          // We need the whole thing because when we PATCH it later, the API will throw a fit
          // if we only include one of the keys for the extra_settings object
          client({ method: 'GET', url: this.settingsUrl })
            .then(({ data }) => {
              this.extra_settings = data.extra_settings;
              this.selected = this.extra_settings.allow_download_on_metered_connection
                ? Options.USE_METERED
                : Options.DO_NOT_USE_METERED;
            })
            .catch(e => {
              logging.error(e);
            })
            .finally(() => (this.loading = false));
        });
      }
    },
    methods: {
      submit() {
        this.$emit('submit', this.selected);

        const allow_download_on_metered_connection = this.selected === Options.USE_METERED;
        const extra_settings = { ...this.extra_settings, allow_download_on_metered_connection };

        this.loading = true;

        client({
          method: 'PATCH',
          url: this.settingsUrl,
          data: { extra_settings },
        })
          .then(() => {
            this.$emit('update', allow_download_on_metered_connection);
            window.sessionStorage.setItem(meteredNetworkModalDismissedKey, true);
            this.dismissed = true;

            // TODO Uncomment this when strings are not frozen
            //this.$store.dispatch("createSnackbar", this.$tr("saveSuccessNotification"));
          })
          .catch(e => {
            logging.error(e);
            // TODO Uncomment this when strings are not frozen
            //this.$store.dispatch("createSnackbar", this.$tr("saveFailureNotification"));
          })
          .finally(() => (this.loading = false));
      },
    },
    $trs: {
      /* Second-person perspective: "You ..." */
      modalTitle: {
        message: 'Use mobile data?',
        context:
          'Title of a modal that permits a user to continue with or without using a mobile data connection',
      },
      modalDescription: {
        message:
          'You may have a limited amount of data on your mobile plan. Allowing Kolibri to download resources via mobile data may use up your entire plan and/or incur extra charges.',
        context: 'Information in a modal informing a user about their connection status.',
      },
      doNotUseMetered: {
        message: 'Do not allow Kolibri to use mobile data',
        context: 'An option that a user can select in a form',
      },
      useMetered: {
        message: 'Allow Kolibri to use mobile data',
        context: 'An option that a user can select in a form',
      },
      /** TODO Uncomment these when strings are not frozen, then use them to fix the other TODO
      *  above in this file.

    saveFailureNotification: {
      message: 'Settings have not been updated',
      context: 'Error message that displays if device settings are not saved correctly.',
    },
    saveSuccessNotification: {
      message: 'Settings have been updated',
      context: 'Notification that displays if device settings have been saved correctly.\n',
    },

    */
    },
  };

</script>

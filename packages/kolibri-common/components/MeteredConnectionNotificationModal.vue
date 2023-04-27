<template>

  <KModal
    v-if="true"
    :title="$tr('modalTitle')"
    :submitText="coreString('continueAction')"
    @submit="$emit('submit')"
  >
    <div>

      <p>{{ "METERED: " + JSON.stringify(isMetered) }}</p>
      <p>{{ "displayMeteredConnectionWarning: " + displayMeteredConnectionWarning }}</p>
      <p>{{ $tr('modalDescription') }}</p>

      <KRadioButton
        v-model="selected"
        :label="$tr('doNotUseMetered')"
        :value="Options.DO_NOT_USE_METERED"
        class="radio-button"
      />
      <KRadioButton
        v-model="selected"
        :label="$tr('useMetered')"
        :value="Options.USE_METERED"
        class="radio-button"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import appCapabilities from 'kolibri.utils.appCapabilities';

  const Options = Object.freeze({
    DO_NOT_USE_METERED: 'DO_NOT_USE_METERED',
    USE_METERED: 'USE_METERED',
  });

  export default {
    name: 'MeteredConnectionNotificationModal',
    mixins: [commonCoreStrings],

    data() {
      return {
        Options,
        isMetered: false,
        selected: Options.DO_NOT_USE_METERED,
      };
    },
    computed: {
      displayMeteredConnectionWarning() {
        return this.isMetered;
      },
    },
    mounted() {
      appCapabilities.checkIsMetered().then(check => (this.isMetered = check().value));
      appCapabilities.checkIsMetered().then(check => console.log(check().value));
      setInterval(() => {
        appCapabilities.checkIsMetered().then(check => (this.isMetered = check().value));
      }, 1000);
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
    },
  };

</script>

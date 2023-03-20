<template>

  <KModal
    v-if="displayMeteredConnectionWarning"
    :title="$tr('modalTitle')"
    :submitText="coreString('continueAction')"
    @submit="$emit('submit')"
  >
    <div>
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
        selected: Options.DO_NOT_USE_METERED,
      };
    },
    computed: {
      displayMeteredConnectionWarning() {
        return true;
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
    },
  };

</script>

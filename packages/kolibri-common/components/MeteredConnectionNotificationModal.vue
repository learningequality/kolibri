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
        message: 'Use metered data?',
        context:
          'Title of a modal that permits a user to continue with or without using a metered data connection',
      },
      modalDescription: {
        message:
          'You are using a metered connection. If you are on a limited data plan, you may have to pay extra charges.',
        context: 'Information in a modal informing a user about their connection status.',
      },
      doNotUseMetered: {
        message: 'No, do not use metered data',
        context: 'An option that a user can select in a form',
      },
      useMetered: {
        message: 'Yes, use metered data',
        context: 'An option that a user can select in a form',
      },
    },
  };

</script>

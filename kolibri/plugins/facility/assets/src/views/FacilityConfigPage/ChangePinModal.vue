<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('needToSync') }}</p>
      <p>{{ $tr('setPin') }}</p>

      <KTextbox
        v-model="name"
        input="number"
        :label="$tr('enterPinLabel')"
        :maxlength="4"
        @blur="nameBlurred = true"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ChangePinModal',
    mixins: [commonCoreStrings],
    methods: {},

    $trs: {
      title: {
        message: 'Change device management PIN',
        context: 'Title for the change pin modal.',
      },
      needToSync: {
        message:
          'You will need to sync this device with other devices that share this facility in order to use this PIN.',
        context: 'Reminder to sync devices',
      },
      setPin: {
        message: 'Choose four numbers to set as your new PIN.',
        context: 'Label to allow user to choose numbers to set PIN',
      },
      cancel: {
        message: 'cancel',
        context: 'cancel btn text',
      },
      save: {
        message: 'save',
        context: 'Text for save button',
      },
      enterPinLabel: {
        message: 'Enter PIN',
        context: 'Enter PIN label',
      },
    },
  };

</script>

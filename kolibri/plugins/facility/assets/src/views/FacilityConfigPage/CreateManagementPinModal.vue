<template>

  <KModal
    :title="$tr('title')"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('newToSync') }}</p>
      <p>{{ $tr('enterPin') }}</p>

      <KTextbox
        v-model="name"
        type="number"
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
    name: 'CreateManagementPinModal',
    mixins: [commonCoreStrings],
    methods: {},

    $trs: {
      title: {
        message: 'Create device management PIN',
        context: 'Title for the create management modal.',
      },
      newToSync: {
        message:
          'You will need to sync this device with other devices with the same facility in order to use this PIN.',
        context: 'Reminder to sync devices',
      },
      enterPin: {
        message: 'Enter four numbers to set as your new PIN',
        context: 'Label to allow user to enter PIN',
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

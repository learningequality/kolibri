<template>

  <KModal
    :title="$tr('title')"
    :submitText="coreString('removePinPlacholder')"
    :cancelText="coreString('cancelAction')"
    @submit="removePin"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('warningToSync') }}</p>
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'RemovePinModal',
    mixins: [commonCoreStrings],
    methods: {
      removePin() {
        this.$emit('submit');
        this.showSnackbarNotification('pinRemove');
      },
    },
    $trs: {
      title: {
        message: 'Remove device management PIN',
        context: 'Title for the remove pin modal.',
      },
      warningToSync: {
        message:
          'You will need to sync this device with other devices that share this facility in order to use this PIN.',
        context: 'Reminder to sync devices',
      },
    },
  };

</script>

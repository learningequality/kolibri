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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { mapActions } from 'vuex';

  export default {
    name: 'RemovePinModal',
    mixins: [commonCoreStrings],
    computed: {},
    methods: {
      ...mapActions('facilityConfig', ['unsetPin']),
      removePin() {
        this.unsetPin();
        this.$emit('submit');
        this.showSnackbarNotification('pinRemove');
      },
    },
    $trs: {
      title: {
        message: 'Remove device management PIN',
        context: 'Title for the remove PIN modal.',
      },
      warningToSync: {
        message:
          'You will need to sync this device with other devices that have the same facility in order for this PIN to be removed.',
        context: 'Reminder to sync devices',
      },
    },
  };

</script>

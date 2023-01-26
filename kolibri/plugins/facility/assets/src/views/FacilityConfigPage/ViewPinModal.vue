<template>

  <KModal
    :title="$tr('title')"
    :cancelText="$tr('close')"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ userPinNumber }}</p>

    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ViewPinModal',
    mixins: [commonCoreStrings],
    computed: {
      userPinNumber() {
        return 123;
      },
    },
    methods: {},

    $trs: {
      title: {
        message: 'Device management PIN',
        context: 'Title for the view pin modal.',
      },
      close: {
        message: 'close',
        context: 'close button for the modal',
      },
    },
  };

</script>

<template>

  <KModal
    :title="$tr('title')"
    :cancelText="$tr('close')"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ $tr('pin') }}</p>

    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ViewPinModal',
    mixins: [commonCoreStrings],
    methods: {},

    $trs: {
      title: {
        message: 'Device management PIN',
        context: 'Title for the view pin modal.',
      },
      pin: {
        message: '123',
        context: 'user pin',
      },
      close: {
        message: 'close',
        context: 'close button for the modal',
      },
    },
  };

</script>

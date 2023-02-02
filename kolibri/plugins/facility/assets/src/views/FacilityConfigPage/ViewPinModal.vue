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

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ViewPinModal',
    mixins: [commonCoreStrings],
    computed: {
      ...mapState('facilityConfig', ['settings']),
      userPinNumber() {
        return this.settings['extra_fields']['pin_code'];
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

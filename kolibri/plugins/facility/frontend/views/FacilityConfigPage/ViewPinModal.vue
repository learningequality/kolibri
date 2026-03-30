<template>

  <KModal
    :title="$tr('title')"
    :cancelText="coreString('closeAction')"
    @cancel="$emit('cancel')"
  >
    <div>
      <p>{{ userPinNumber }}</p>
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'ViewPinModal',
    mixins: [commonCoreStrings],
    props: {
      pin: {
        type: String,
        required: true,
      },
    },
    computed: {
      userPinNumber() {
        return this.pin;
      },
    },
    methods: {},

    $trs: {
      title: {
        message: 'Device management PIN',
        context: 'Title for the view PIN modal.',
      },
    },
  };

</script>

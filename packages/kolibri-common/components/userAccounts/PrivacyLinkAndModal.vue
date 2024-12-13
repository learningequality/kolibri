<template>

  <div>
    <KButton
      :text="text || coreString('usageAndPrivacyLabel')"
      appearance="basic-link"
      @click="privacyModalVisible = true"
    />
    <PrivacyInfoModal
      v-if="privacyModalVisible"
      v-bind="modalProps"
      @submit="privacyModalVisible = false"
      @cancel="privacyModalVisible = false"
    />
  </div>

</template>


<script>

  import PrivacyInfoModal from 'kolibri/components/PrivacyInfoModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'PrivacyLinkAndModal',
    components: {
      PrivacyInfoModal,
    },
    mixins: [commonCoreStrings],
    props: {
      text: {
        type: String,
        default: null,
      },
      modalProps: {
        type: Object,
        required: false,
        default() {
          return {};
        },
      },
    },
    data() {
      return {
        privacyModalVisible: false,
      };
    },
  };

</script>


<style lang="scss" scoped></style>

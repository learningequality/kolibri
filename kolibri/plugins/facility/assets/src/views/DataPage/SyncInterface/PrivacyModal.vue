<template>

  <KModal
    :title="$tr('syncToKDP')"
    :cancelText="$tr('close')"
    @cancel="closeModal"
  >
    {{ $tr('privacyText') }}

  </KModal>

</template>


<script>

  export default {
    name: 'PrivacyModal',
    components: {},
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      syncToKDP: 'Sync to Kolibri Data Portal',
      privacyText:
        'By doing this, you are granting access to your data to organization admins. It will be uploaded to cloud servers operated by Learning Equality.',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>

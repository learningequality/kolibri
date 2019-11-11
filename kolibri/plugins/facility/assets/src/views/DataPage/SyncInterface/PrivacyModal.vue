<template>

  <KModal
    :title="$tr('syncToKDP')"
    :submitText="$tr('close')"
    size="medium"
    @cancel="closeModal"
    @submit="closeModal"
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
      syncToKDP: 'Kolibri Data Portal',
      privacyText:
        'By syncing this facility with the Kolibri Data Portal, you are granting access to your data to organization admins on Kolibri Data Portal. It will be uploaded to cloud servers operated by Learning Equality, who will also have access to this data.',
      close: 'Close',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

</style>

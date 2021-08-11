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
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      syncToKDP: {
        message: 'Kolibri Data Portal',
        context:
          'If the Kolibri facility is part of a larger organization that tracks data on the Kolibri Data Portal, the user receives a project token to sync the facility data with servers operated by Learning Equality in the cloud.',
      },
      privacyText: {
        message:
          'By syncing this facility with the Kolibri Data Portal, you are granting access to your data to organization admins on Kolibri Data Portal. It will be uploaded to cloud servers operated by Learning Equality, who will also have access to this data.',
        context:
          "Text description on the 'Usage and privacy' pop-up window in the Facility > Data section.\n",
      },
      close: {
        message: 'Close',
        context:
          "Refers to the 'Close' button on the 'Usage and privacy' pop-up window in the Facility > Data section.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

</style>

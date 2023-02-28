<template>

  <KModal
    :title="$tr('removeFromLibrary')"
    :submitText="$tr('remove')"
    :cancelText="coreString('cancelAction')"
    @submit="removeResources"
    @cancel="$emit('cancel')"
  >
    You will no longer be able to use this resource, but you can download
    it again later when it’s available around you.
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ConfirmationDeleteModal',
    mixins: [commonCoreStrings],
    props: {
      resourcesToDelete: {
        type: Array,
        required: true,
      },
    },
    methods: {
      removeResources() {
        console.log('Removing', this.resourcesToDelete);
        this.$emit('success');
      },
    },
    $trs: {
      removeFromLibrary: {
        message: 'Remove from library',
        context:
          'Title of the modal that appears when the user tries to remove a resource from the library.',
      },
      remove: {
        message: 'Remove',
        context: 'An action that describes removing some resources.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

</style>

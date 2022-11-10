<template>

  <KModal
    :title="$tr('removeStorageLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('removeStorageLocationDescription') }}</p>
    <p>{{ $tr('deleteFilesDescription') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'RemoveStorageLocationModal',
    mixins: [commonCoreStrings],
    $trs: {
      removeStorageLocation: {
        message: 'Remove storage location',
        context: 'Prompt for removing a storage location.',
      },
      removeStorageLocationDescription: {
        message:
          'Removing a storage location will remove access to them on Kolibri, but will not delete the resources from your device.',
        context: 'Description for removing a storage location.',
      },
      deleteFilesDescription: {
        message:
          "If you want to delete the files from your device after removing the storage location, you will need to manually do so from your device's file system.",
        context: 'Description for deleting a file after removing a storage location.',
      },
    },
  };

</script>

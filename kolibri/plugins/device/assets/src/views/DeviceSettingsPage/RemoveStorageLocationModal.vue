<template>

  <KModal
    :title="$tr('removeStorageLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p class="description">
      {{ $tr('removeStorageLocationDescription') }}
    </p>
    <p>{{ $tr('deleteFilesDescription') }}</p>
    <KRadioButton
      v-for="path in storageLocations"
      :key="path.index"
      v-model="selectedPath"
      :buttonValue="path"
      :label="path"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { getPathPermissions } from './api';

  export default {
    name: 'RemoveStorageLocationModal',
    mixins: [commonCoreStrings],
    props: {
      storageLocations: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        selectedPath: this.storageLocations[0],
      };
    },
    methods: {
      handleSubmit() {
        getPathPermissions(this.selectedPath).then(permissions => {
          const writable = permissions.data.writable;
          if (permissions.data.directory) {
            this.$emit('submit', this.selectedPath, writable);
          }
        });
      },
    },
    $trs: {
      removeStorageLocation: {
        message: 'Removing storage location',
        context: 'Prompt for removing a storage location.',
      },
      removeStorageLocationDescription: {
        message:
          'When you remove a storage location, Kolibri will not be able to access it, but resources will not be deleted from your device.',
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


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>

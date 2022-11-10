<template>

  <KModal
    :title="$tr('newStorageLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="submitDisabled"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('newStorageLocationDescription') }}</p>
    <KTextbox
      ref="autoDownloadLimit"
      v-model="path"
      type="text"
      :label="$tr('filePath')"
      :invalid="invalidPath"
      :invalidText="$tr('error')"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'AddStorageLocationModal',
    mixins: [commonCoreStrings],
    data() {
      return {
        path: null,
      };
    },
    $trs: {
      newStorageLocation: {
        message: 'New storage location file path',
        context: 'Prompt for adding a new storage location.',
      },
      newStorageLocationDescription: {
        message:
          'Copy and paste a file path from your Kolibri server that contains Kolibri channels. By default, channels exported to a drive from Kolibri will be in a content folder called KOLIBRI_DATA_DIR.',
        context: 'Description for adding a storage location.',
      },
      filePath: {
        message: 'File path',
        context: 'Label for new storage location input',
      },
      error: {
        message: 'Invalid path',
        context: 'Error text for new storage location input',
      },
    },
  };

</script>

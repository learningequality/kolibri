<template>

  <KModal
    :title="$tr('newStorageLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p class="description">
      {{ $tr('newStorageLocationDescription') }}
    </p>
    <KTextbox
      ref="autoDownloadLimit"
      v-model="path"
      type="text"
      :label="$tr('filePath')"
      :invalid="invalidPath"
      :invalidText="showError"
      :showInvalidText="true"
      @input="invalidPath = false"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { getPathPermissions } from './api';

  export default {
    name: 'AddStorageLocationModal',
    mixins: [commonCoreStrings],
    props: {
      paths: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        path: null,
        invalidPath: false,
        errorType: null,
      };
    },
    computed: {
      showError() {
        if (this.errorType === 'directory') {
          return this.$tr('errorInvalidFolder');
        } else {
          return this.$tr('errorExistingFolder');
        }
      },
    },
    methods: {
      handleSubmit() {
        getPathPermissions(this.path).then(permissions => {
          const writable = permissions.data.writable;
          const exists = this.paths.filter(el => el.path === this.path);
          if (exists.length > 0) {
            this.invalidPath = true;
            this.errorType = 'exists';
            return;
          }
          this.invalidPath = !permissions.data.directory;
          if (permissions.data.directory) {
            this.$emit('submit', permissions.data.path, writable);
          } else {
            this.errorType = 'directory';
          }
        });
      },
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
      errorInvalidFolder: {
        message: 'This is not a valid folder in the server',
        context: 'Error text for new storage location input',
      },
      errorExistingFolder: {
        message: 'This folder is already in the list of storage locations',
        context: 'Error text for new storage location input',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>

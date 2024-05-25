<template>

  <KModal
    :title="$tr('createNewFolderLabel')"
    :submitText="coreString('createAction')"
    :cancelText="coreString('cancelAction')"
    size="medium"
    @submit="handleSubmit"
    @cancel="handleClickCancel"
  >

    <KTextbox 
      ref="folderNameTextBox"
      v-model="folderName"
      :label="$tr('folderNameFieldLabel')"
      :invalid="folderNameInvalid"
      :invalidText="coreString('requiredFieldError')"
      :maxlength="200"
    />

  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'NewFolderModal',
    mixins: [commonCoreStrings],
    props: {
      
    },
    data() {
      return {
        folderName: '',
      };
    },
    computed: {
      folderNameInvalid() {
        return !this.folderName || this.folderName.trim() === '';
      },
    },
    methods: {
      handleSubmit() {
        if (this.folderNameInvalid) {
          this.$refs.folderNameTextBox.focus();
        }
        // TODO Handle submit

      },
      handleClickCancel() {
        this.$emit('cancel');
      },
    },
    $trs: {
      createNewFolderLabel: {
        message: 'Create new folder',
        context: 'Title for create new folder modal',
      },
      folderNameFieldLabel: {
        message: 'Folder name',
        context: 'The field where the user adds the name for creating a new folder.',
      },
    },
  }


</script>


<style lang="scss" scoped>


</style>
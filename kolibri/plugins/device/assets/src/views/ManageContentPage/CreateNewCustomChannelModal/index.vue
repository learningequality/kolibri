<template>

  <KModal
    :title="channel ? $tr('editChannelLabel') : $tr('createNewCustomChannelLabel')"
    :submitText="channel ? coreString('editAction') : coreString('createAction')"
    :cancelText="coreString('cancelAction')"
    size="medium"
    @submit="handleSubmit"
    @cancel="handleClickCancel"
  >
    <KTextbox
      ref="channelNameTextBox"
      v-model="channelName"
      :label="$tr('channelNameFieldLabel')"
      :invalid="channelNameInvalid"
      :invalidText="coreString('requiredFieldError')"
      :maxlength="200"
    />

    <KTextbox
      ref="channelDescriptionTextBox"
      v-model="channelDescription"
      :label="$tr('channelDescriptionFieldLabel')"
      :textArea="true"
    />
  </KModal>
</template>


<script>

  import { mapMutations } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'CreateNewCustomChannelModal',
    mixins: [commonCoreStrings],
    props: {
      manageMode: {
        type: Boolean,
        required: false,
      },
      channel: {
        type: Object,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        channelName: this.channel ? this.channel.name : '',
        channelDescription: this.channel ? this.channel.description : '',
      };
    },
    computed: {
      channelNameInvalid() {
        return !this.channelName || this.channelName.trim() === '';
      },
    },
    methods: {
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
      handleSubmit() {
        if (this.channelNameInvalid) {
          return this.$refs.channelNameTextBox.focus();
        }
        // TODO Handle submit
      },
      handleClickCancel() {
        if (this.manageMode) {
          this.$emit('cancel');
        } else {
          this.resetContentWizardState();
        }
      },
    },
    $trs: {
      createNewCustomChannelLabel: {
        message: 'Create new channel',
        context: 'Title for create new custom channel modal',
      },
      editChannelLabel: {
        message: 'Edit channel details',
        context: 'Title for edit custom channel modal',
      },
      channelNameFieldLabel: {
        message: 'Channel name',
        context: 'The field where the user adds the name for the custom channel',
      },
      channelDescriptionFieldLabel: {
        message: 'Description (optional)',
        context: 'The field where the user adds the description for the custom channel (labeled as optional)',
      },
    }
  }

</script>


<style lang="scss" scoped></style>
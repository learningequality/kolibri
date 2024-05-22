<template>

  <KModal
    :title="$tr('createNewCustomChannelLabel')"
    :submitText="$tr('createChannelButtonLabel')"
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
    },
    data() {
      return {
        channelName: '',
        channelDescription: '',
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
        // TODO Handle submit
        if (this.channelNameInvalid) {
          return this.$refs.channelNameTextBox.focus();
        }
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
      channelNameFieldLabel: {
        message: 'Channel name',
        context: 'The field where the user adds the name for the custom channel',
      },
      channelDescriptionFieldLabel: {
        message: 'Description (optional)',
        context: 'The field where the user adds the description for the custom channel (labeled as optional)',
      },
      createChannelButtonLabel: {
        message: 'create',
        context: 'Label for create channel submit button.',
      }
    }
  }

</script>


<style lang="scss" scoped></style>
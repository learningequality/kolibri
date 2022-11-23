<template>

  <KModal
    :title="$tr('serverRestart')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p v-if="changedSetting === 'add'" class="description">
      {{ $tr('selectedPath', { path: path.path }) }}
    </p>
    <p class="description">
      {{ getMessage() }}
    </p>
    <div v-if="changedSetting === 'add' && path.writable === true">
      <KCheckbox
        :checked="confirmationChecked"
        :label="$tr('makePrimary')"
        :description="$tr('labelPrimary')"
        @change="confirmationChecked = $event"
      />
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ServerRestartModal',
    mixins: [commonCoreStrings],
    props: {
      changedSetting: {
        type: String, // primary, remove, add
        required: true,
      },
      path: {
        type: Object,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        confirmationChecked: false,
      };
    },
    methods: {
      getMessage() {
        let message = '';
        if (this.changedSetting === 'primary') {
          message = this.$tr('newPrimaryLocationRestartDescription');
        } else if (this.changedSetting === 'remove') {
          message = this.$tr('removeLocationRestartDescription');
        } else if (this.changedSetting === 'add') {
          message = this.$tr('newLocationRestartDescription');
        }

        return message + this.$tr('serverRestartDecription');
      },
      handleSubmit() {
        if (this.changedSetting === 'add') {
          this.$emit('submit', this.confirmationChecked);
        } else {
          this.$emit('submit');
        }
      },
    },
    $trs: {
      serverRestart: {
        message: 'Server restart',
        context: 'Prompt for removing a storage location.',
      },
      newLocationRestartDescription: {
        message: 'Server needs to restart to add a new storage location.',
        context: 'Reason to restart the server.',
      },
      newPrimaryLocationRestartDescription: {
        message: 'Changing the primary storage location will restart this server.',
        context: 'Reason to restart the server.',
      },
      removeLocationRestartDescription: {
        message: 'Removing a storage location will restart this server.',
        context: 'Reason to restart the server.',
      },
      serverRestartDecription: {
        message:
          ' Anyone using Kolibri on this server right now will temporarily be unable to use it.',
        context: 'Description for restarting the server.',
      },
      selectedPath: {
        message: 'Selected: {path}',
        context: 'Label for the selected path.',
      },
      makePrimary: {
        message: 'Make this the primary storage location',
        context: 'Checkbox to make primary storage location.',
      },
      labelPrimary: {
        message: 'Newly downloaded resources will be added to the primary storage location',
        context: 'Label for primary storage location.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>

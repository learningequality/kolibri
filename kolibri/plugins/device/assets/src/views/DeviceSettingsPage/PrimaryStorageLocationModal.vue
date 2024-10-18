<template>

  <KModal
    :title="$tr('changePrimaryLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p class="description">
      {{ deviceString('primaryStorageLabel') }}
    </p>
    <KRadioButton
      v-for="path in storageLocations"
      :key="path.index"
      v-model="selectedPath"
      :buttonValue="path.path"
      :label="path.path"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonDeviceStrings from '../commonDeviceStrings';

  export default {
    name: 'PrimaryStorageLocationModal',
    mixins: [commonCoreStrings, commonDeviceStrings],
    props: {
      storageLocations: {
        type: Array,
        required: true,
      },
      primaryPath: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedPath: this.primaryPath,
      };
    },
    methods: {
      handleSubmit() {
        if (this.selectedPath === this.primaryPath) {
          this.$emit('cancel');
          return;
        }
        this.$emit('submit', this.selectedPath);
      },
    },
    $trs: {
      changePrimaryLocation: {
        message: 'Change primary storage location',
        context: 'Prompt for changing the primary storage location.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>

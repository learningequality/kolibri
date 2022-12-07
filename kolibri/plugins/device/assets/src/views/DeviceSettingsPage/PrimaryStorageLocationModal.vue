<template>

  <KModal
    :title="$tr('changePrimaryLocation')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p class="description">
      {{ $tr('primaryLocationChangeDescription') }}
    </p>
    <KRadioButton
      v-for="path in storageLocations"
      :key="path.index"
      v-model="selectedPath"
      :value="path.path"
      :label="path.path"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'PrimaryStorageLocationModal',
    mixins: [commonCoreStrings],
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
      primaryLocationChangeDescription: {
        message: 'Newly downloaded resources will be added to the primary storage location',
        context: 'Description of primary storage location change message.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>

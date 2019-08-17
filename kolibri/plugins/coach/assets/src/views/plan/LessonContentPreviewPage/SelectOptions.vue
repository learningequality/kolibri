<template>

  <div class="select-options">
    <template v-if="isSelected">
      <mat-svg
        class="selected-icon"
        category="action"
        name="check_circle"
      />
      {{ $tr('addedIndicator') }}
      <KButton
        :text="coreString('removeAction')"
        :primary="true"
        class="no-margin"
        @click="$emit('removeResource')"
      />
      <!-- TODO include undo button here -->
    </template>
    <KButton
      v-else
      :text="$tr('addButtonLabel')"
      :primary="true"
      class="no-margin"
      @click="$emit('addResource')"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'SelectOptions',
    mixins: [commonCoreStrings],
    props: {
      isSelected: {
        type: Boolean,
        required: true,
      },
    },
    $trs: {
      addButtonLabel: 'Add',
      addedIndicator: 'Added',
    },
  };

</script>


<style lang="scss" scoped>

  .selected-icon {
    position: relative;
    top: 4px;
    width: 20px;
    height: 20px;
  }

  .no-margin {
    margin-right: 0;
  }

</style>

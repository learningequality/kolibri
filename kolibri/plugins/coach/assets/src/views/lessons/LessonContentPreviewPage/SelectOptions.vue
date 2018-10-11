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
        @click="$emit('removeResource')"
        :text="$tr('removeLabel')"
        :primary="true"
        class="no-margin"
      />
      <!-- TODO include undo button here -->
    </template>
    <KButton
      v-else
      @click="$emit('addResource')"
      :text="$tr('addButtonLabel')"
      :primary="true"
      class="no-margin"
    />
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';

  export default {
    name: 'SelectOptions',
    components: {
      KButton,
    },
    $trs: {
      removeLabel: 'Remove',
      addButtonLabel: 'Add',
      addedIndicator: 'Added',
    },
    props: {
      isSelected: {
        type: Boolean,
        required: true,
      },
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

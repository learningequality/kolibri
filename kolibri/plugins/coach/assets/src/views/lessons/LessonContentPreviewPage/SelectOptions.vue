<template>

  <div class="select-options">
    <template v-if="isSelected">
      <mat-svg
        class="selected-icon"
        category="action"
        name="check_circle"
      />
      {{ $tr('addedToLessonIndicator') }}
      <k-button
        @click="removeFromWorkingResources"
        :text="$tr('undoButtonLabel')"
        appearance="basic-link"
      />
      <!-- TODO include undo button here -->
    </template>
    <k-button
      v-else
      @click="addToWorkingResources"
      :text="$tr('addToLessonButtonLabel')"
    />
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'selectOptions',
    components: {
      kButton,
    },
    $trs: {
      undoButtonLabel: 'Undo',
      addToLessonButtonLabel: 'Add to lesson',
      addedToLessonIndicator: 'Added to lesson',
    },
    props: {
      workingResources: {
        type: Array,
        required: true,
      },
      contentId: {
        type: String,
        required: true,
      },
    },
    computed: {
      isSelected() {
        return this.workingResources.includes(this.contentId);
      },
    },
    vuex: {
      actions: {
        // Maybe break these out to actual actions.
        // Used by select page, summary page, and here
        addToWorkingResources(store) {
          this.$emit('addresource');
          store.dispatch('ADD_TO_WORKING_RESOURCES', this.contentId);
        },
        removeFromWorkingResources(store) {
          store.dispatch('REMOVE_FROM_WORKING_RESOURCES', this.contentId);
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .selected-icon
    height: 20px
    width: 20px
    vertical-align: bottom

</style>

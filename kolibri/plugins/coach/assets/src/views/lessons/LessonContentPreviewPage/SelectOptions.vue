<template>

  <div class="select-options">
    <template v-if="isSelected">
      <mat-svg
        class="selected-icon"
        category="action"
        name="check_circle"
      />
      {{ $tr('addedToLessonIndicator') }}
      <KButton
        @click="removeFromWorkingResources"
        :text="$tr('undoButtonLabel')"
        appearance="basic-link"
      />
      <!-- TODO include undo button here -->
    </template>
    <KButton
      v-else
      @click="addToWorkingResources"
      :text="$tr('addToLessonButtonLabel')"
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
    methods: {
      // Maybe break these out to actual actions.
      // Used by select page, summary page, and here
      addToWorkingResources() {
        this.$emit('addresource');
        this.$store.commit('lessonSummary/ADD_TO_WORKING_RESOURCES', this.contentId);
      },
      removeFromWorkingResources() {
        this.$store.commit('lessonSummary/REMOVE_FROM_WORKING_RESOURCES', this.contentId);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selected-icon {
    width: 20px;
    height: 20px;
    vertical-align: bottom;
  }

</style>

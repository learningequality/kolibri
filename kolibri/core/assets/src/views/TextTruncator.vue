<template>

  <div :style="{ maxHeight: `${maxHeight - 16}px` }" :class="{ truncated: !shaveDone }">
    <div v-if="viewAllText">
      {{ text }}
    </div>
    <div v-else ref="shaveEl" class="truncated">
      {{ text }}
    </div>
    <div
      v-if="showViewMore && (textIsTruncated || viewAllText)"
      class="show-more"
    >
      <KButton
        appearance="basic-link"
        :text="viewAllText ? $tr('viewLessButtonPrompt') : coreString('viewMoreAction')"
        @click.stop.prevent="viewAllText = !viewAllText"
      />
    </div>
  </div>

</template>


<script>

  import shave from 'shave';
  import debounce from 'lodash/debounce';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'TextTruncator',
    mixins: [commonCoreStrings, responsiveElementMixin],
    props: {
      text: {
        type: String,
        required: true,
      },
      maxHeight: {
        type: Number,
        required: true,
        validator(value) {
          return value > 0;
        },
      },
      showViewMore: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        textIsTruncated: false,
        shaveDone: false,
        viewAllText: false,
      };
    },
    computed: {
      currentDimensions() {
        return {
          elementWidth: this.elementWidth,
          elementHeight: this.elementHeight,
        };
      },
      debouncedHandleUpdate() {
        return debounce(this.handleUpdate, 50);
      },
    },
    watch: {
      currentDimensions() {
        this.debouncedHandleUpdate();
      },
    },
    beforeDestroy() {
      this.debouncedHandleUpdate.cancel();
    },
    methods: {
      titleIsShaved() {
        return Boolean(this.$el.querySelector('.js-shave'));
      },
      titleIsOverflowing() {
        // This checks to see if shave.js did not work, but the text is still
        // overflowing. This can happen if `text` prop is one long string.
        const $shaveEl = this.$refs.shaveEl;
        if (!$shaveEl) {
          return false;
        } else {
          return $shaveEl.clientWidth < $shaveEl.scrollWidth;
        }
      },
      updateTitle() {
        // Set title attribute as full text if the visible text is truncated
        if (this.textIsTruncated && !this.$refs.shaveEl.title) {
          this.$refs.shaveEl.setAttribute('title', this.text);
        } else if (!this.textIsTruncated && this.$refs.shaveEl.title) {
          // Remove if text is fully visible after a resize
          this.$refs.shaveEl.removeAttribute('title');
        }
      },
      handleUpdate() {
        // TODO make "View Less" disappear when user expands window
        // and text isn't truncated anymore.
        shave(this.$refs.shaveEl, this.maxHeight, { spaces: false });
        this.$nextTick().then(() => {
          this.textIsTruncated = this.titleIsShaved() || this.titleIsOverflowing();
          this.updateTitle();
          // Removes temporary truncated styling from main div
          this.shaveDone = true;
        });
      },
    },
    $trs: {
      viewLessButtonPrompt: {
        message: 'View less',
        context:
          "Button which allows a user to view less information. It's the opposite of 'View more'.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .show-more {
    margin-top: 8px;
    text-align: right;
  }

  // If the text is a long single word (and not shortened by shave.js),
  // then apply this CSS instead
  .truncated {
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>

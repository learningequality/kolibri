<template>

  <div>
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
        viewAllText: false,
      };
    },
    computed: {
      currentDimensions() {
        return {
          text: this.text,
          maxHeight: this.maxHeight,
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
      handleUpdate() {
        // TODO make "View Less" disappear when user expands window
        // and text isn't truncated any more.
        shave(this.$refs.shaveEl, this.maxHeight, { spaces: false });
        this.$nextTick(() => {
          this.textIsTruncated = this.titleIsShaved() || this.titleIsOverflowing();
          // set title attribute for shaved text but
          // skip if a title already exists
          if (this.textIsTruncated && !this.$refs.shaveEl.title)
            this.$refs.shaveEl.setAttribute('title', this.text);
          // if the text is not shaved and a title has been previously set,
          // remove it
          else if (!this.textIsTruncated && this.$refs.shaveEl.title)
            this.$refs.shaveEl.removeAttribute('title');
        });
      },
    },
    $trs: {
      viewLessButtonPrompt: 'View less',
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

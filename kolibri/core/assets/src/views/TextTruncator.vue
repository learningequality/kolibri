<template>

  <div>
    <div v-if="viewAllText">
      {{ text }}
    </div>
    <div v-else ref="shaveEl">
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
      handleUpdate() {
        // TODO make "View Less" disappear when user expands window
        // and text isn't truncated any more.
        shave(this.$refs.shaveEl, this.maxHeight);
        this.$nextTick(() => {
          this.textIsTruncated = Boolean(this.$el.querySelector('.js-shave'));
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

</style>

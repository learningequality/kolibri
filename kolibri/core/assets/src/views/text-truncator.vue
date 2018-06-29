<template>

  <div>
    <div v-if="viewAllText">{{ text }}</div>
    <div
      v-else
      ref="shaveEl"
      :title="tooltipText"
    >
      {{ text }}
    </div>
    <div class="ar">
      <k-button
        v-if="showViewMore && (textIsTruncated || viewAllText)"
        appearance="basic-link"
        :text="viewAllText ? $tr('viewLessButtonPrompt') : $tr('viewMoreButtonPrompt')"
        @click.stop.prevent="viewAllText = !viewAllText"
      />
    </div>
  </div>

</template>


<script>

  import shave from 'shave';
  import responsiveElement from 'kolibri.coreVue.mixins.responsiveElement';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'textTruncator',
    components: {
      kButton,
    },
    mixins: [responsiveElement],
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
      showTooltip: {
        type: Boolean,
        required: false,
        default: true,
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
      tooltipText() {
        if (!this.showTooltip || this.showViewMore || !this.textIsTruncated) {
          return null;
        }
        return this.text;
      },
    },
    watch: {
      text: 'handleUpdate',
      maxHeight: 'handleUpdate',
      elSize: {
        handler() {
          this.handleUpdate();
        },
        deep: true,
      },
    },
    methods: {
      handleUpdate() {
        shave(this.$refs.shaveEl, this.maxHeight);
        this.$nextTick(() => {
          this.textIsTruncated = Boolean(this.$el.querySelector('.js-shave'));
        });
      },
    },
    $trs: {
      viewMoreButtonPrompt: 'View more',
      viewLessButtonPrompt: 'View less',
    },
  };

</script>


<style lang="stylus" scoped>

  .ar
    text-align: right

</style>

<template>

  <div>
    <div v-if="viewAllText">{{ text }}</div>
    <KTooltip
      v-else
      :disabled="!tooltipText"
    >
      <div
        slot="trigger"
        ref="shaveEl"
      >
        {{ text }}
      </div>
      <div slot="tooltip">
        {{ tooltipText }}
      </div>
    </KTooltip>
    <div class="ar">
      <KButton
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
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTooltip from 'kolibri.coreVue.components.KTooltip';

  export default {
    name: 'TextTruncator',
    components: {
      KButton,
      KTooltip,
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
      text() {
        this.handleUpdate();
      },
      maxHeight() {
        this.handleUpdate();
      },
      elementWidth() {
        this.handleUpdate();
      },
      elementHeight() {
        this.handleUpdate();
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


<style lang="scss" scoped>

  .ar {
    text-align: right;
  }

</style>

<template>

  <div>
    <div v-if="viewAll">
      <slot></slot>
    </div>
    <div
      v-else
      ref="content"
      :style="{ maxHeight: `${maxHeight}px` }"
      class="truncated"
    >
      <div
        v-if="slotIsTruncated"
        :style="{ height: `${maxHeight}px` }"
        class="overlay"
      ></div>
      <slot></slot>
    </div>
    <div
      v-if="showViewMore && (slotIsTruncated || viewAll)"
      class="show-more"
    >
      <KButton
        appearance="basic-link"
        :text="viewAll ? coreString('viewLessAction') : coreString('viewMoreAction')"
        @click.stop.prevent="viewAll = !viewAll"
      />
    </div>
  </div>

</template>


<script>

  import debounce from 'lodash/debounce';
  import useKResponsiveElement from 'kolibri-design-system/lib/composables/useKResponsiveElement';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'SlotTruncator',
    mixins: [commonCoreStrings],
    setup() {
      const { elementWidth, elementHeight } = useKResponsiveElement();
      return {
        elementWidth,
        elementHeight,
      };
    },
    props: {
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
        slotIsTruncated: false,
        viewAll: false,
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
    mounted() {
      this.handleUpdate();
    },
    beforeDestroy() {
      this.debouncedHandleUpdate.cancel();
    },
    methods: {
      handleUpdate() {
        if (!this.viewAll && this.$refs.content) {
          this.slotIsTruncated = this.$refs.content.scrollHeight > this.maxHeight;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .show-more {
    margin-top: 8px;
    text-align: right;
  }

  .truncated {
    overflow: hidden;
  }

  .overlay {
    position: absolute;
    width: 100%;
    background: linear-gradient(rgba(255, 255, 255, 0) 75%, rgba(255, 255, 255, 1));
  }

</style>

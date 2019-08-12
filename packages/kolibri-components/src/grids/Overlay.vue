<template>

  <div>
    <div
      class="overlay"
      :style="marginLeftStyle"
    >
    </div>
    <div
      v-for="n in cols-1"
      :key="n"
      class="overlay"
      :style="gutterStyle(n)"
    >
    </div>
    <div
      class="overlay"
      :style="marginRightStyle"
    >
    </div>
  </div>

</template>


<script>

  import KResponsiveElementMixin from 'kolibri-components/src/KResponsiveElementMixin';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';

  export default {
    name: 'Overlay',
    mixins: [KResponsiveElementMixin, KResponsiveWindowMixin],
    props: {
      cols: {
        type: Number,
        required: true,
      },
      gutterWidth: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        top: 0,
        left: 0,
        right: 0,
      };
    },
    computed: {
      columnWidth() {
        return this.elementWidth / this.cols;
      },
      marginLeftStyle() {
        return {
          left: '0px',
          width: `${this.left}px`,
        };
      },
      marginRightStyle() {
        return {
          left: `${this.right}px`,
          right: '0px',
        };
      },
    },
    watch: {
      windowWidth() {
        this.updateOffset();
      },
      windowHeight() {
        this.updateOffset();
      },
    },
    methods: {
      gutterStyle(n) {
        const left = this.columnWidth * n - this.gutterWidth / 2 + this.left;
        return {
          left: `${left}px`,
          width: `${this.gutterWidth}px`,
        };
      },
      updateOffset() {
        const rect = this.$el.getBoundingClientRect();
        this.top = rect.top;
        this.left = rect.left;
        this.right = rect.right;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .overlay {
    position: fixed;
    top: 0;
    height: 100%;
    pointer-events: none;
    background-color: rgba(0, 100, 255, 0.14);
  }

</style>

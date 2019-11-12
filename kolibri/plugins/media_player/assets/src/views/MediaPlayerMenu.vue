<template>

  <div
    v-show="open"
    class="vjs-menu"
    :aria-hidden="(!open).toString()"
  >
    <div class="vjs-menu-content">
      <ul ref="contentEl" role="menu">
        <slot></slot>
      </ul>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'MediaPlayerMenu',
    data: function() {
      return {
        open: false,
      };
    },
    methods: {
      /**
       * @public
       * @return {Element}
       */
      contentEl() {
        return this.$refs.contentEl;
      },
      /**
       * @public
       */
      show() {
        this.open = true;
      },
      /**
       * @public
       */
      hide() {
        this.open = false;
      },
      /**
       * @public
       * @return {boolean}
       */
      showing() {
        return this.open;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './videojs-style/variables';

  /* for consistency, use `em` since video.js defines these that way */
  .vjs-menu {
    position: absolute;
    bottom: $video-player-control-height;
    background: $video-player-color !important;
  }

  .custom-skin .vjs-menu /deep/ ul {
    padding: 4px 12px 0;

    li {
      padding: 0;
      font-size: 1rem;
      text-transform: none;
    }
  }

</style>

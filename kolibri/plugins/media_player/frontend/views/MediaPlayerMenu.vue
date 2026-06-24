<template>

  <div
    v-show="open"
    class="vjs-menu"
    :aria-hidden="(!open).toString()"
  >
    <div class="vjs-menu-content">
      <ul
        ref="contentEl"
        role="menu"
      >
        <slot></slot>
      </ul>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'MediaPlayerMenu',
    data: function () {
      return {
        open: false,
      };
    },
    methods: {
      /**
       * Accessible via parent component refs.
       * @returns {Element} The content element.
       * @public
       */
      contentEl() {
        return this.$refs.contentEl;
      },
      /**
       * Accessible via parent component refs.
       * @public
       */
      show() {
        this.open = true;
      },
      /**
       * Accessible via parent component refs.
       * @public
       */
      hide() {
        this.open = false;
      },
      /**
       * Accessible via parent component refs.
       * @returns {boolean} Whether the menu is shown.
       * @public
       */
      showing() {
        return this.open;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
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

<template>

  <div>
    <div class="action-bar">
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          class="zoom-out-btn"
          icon="remove"
          color="#FFFFFF"
          size="small"
          aria-label="Zoom out"
          tooltip="Zoom out"
          @click="close"
        />
      </div>
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          class="zoom-in-btn"
          icon="add"
          color="#FFFFFF"
          size="small"
          aria-label="Zoom in"
          tooltip="Zoom in"
          @click="close"
        />
      </div>
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          class="close-btn"
          icon="close"
          color="#FFFFFF"
          size="small"
          aria-label="Close"
          tooltip="Close"
          @click="close"
        />
      </div>
    </div>
    <div
      class="backdrop"
      @click.self="close"
    >
      <img
        :src="src"
        :alt="alt"
        class="expanded-image"
        :class="styleOverrides.windowSizeClass"
      >
    </div>
  </div>

</template>


<script>

  export default {
    name: 'Lightbox',
    props: {
      src: { type: String, required: true },
      alt: { type: String, default: '' },
      styleOverrides: {
        type: Object,
        default: () => ({}),
      },
    },
    computed: {
      btnHoverStyle() {
        return {
          borderRadius: '100%',
          transition: 'background-color 0.15s',
          ':hover': {
            backgroundColor: 'rgba(225, 225, 225, 0.3)',
          },
        };
      },
    },
    methods: {
      close() {
        this.$emit('close');
      },
    },
  };

</script>


<style>

  .action-bar {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    z-index: 10;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: end;
    height: 40px;
    padding-right: 8px;
    background-color: #000000;
  }

  .backdrop {
    position: fixed;
    top: 40px;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background-color: rgba(51, 51, 51, 0.5);
  }

  .expanded-image {
    z-index: 10;
    width: auto;
    max-width: calc(100vw - 64px);
    height: auto;
    max-height: calc(100vh - 40px - 64px);
  }

  .expanded-image.small-window {
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 40px - 32px);
  }

</style>

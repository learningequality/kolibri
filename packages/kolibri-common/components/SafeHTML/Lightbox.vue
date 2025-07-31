<template>

  <dialog
    v-if="open"
    ref="dialogRef"
    closedby="any"
    class="lightbox-dialog"
    @close="closeLightbox"
  >
    <div class="action-bar">
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          id="zoom-out-btn"
          icon="remove"
          color="#FFFFFF"
          size="small"
          aria-label="Zoom out"
          @click="closeLightbox"
        />
        <!-- Use UiTooltip separately with appendToBody=false so tooltip stays above backdrop -->
        <UiTooltip
          :zIndex="24"
          openOn="hover"
          :appendToBody="false"
          :trigger="`#zoom-out-btn`"
        >
          Zoom out
        </UiTooltip>
      </div>
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          id="zoom-in-btn"
          icon="add"
          color="#FFFFFF"
          size="small"
          aria-label="Zoom in"
          @click="closeLightbox"
        />
        <UiTooltip
          :zIndex="24"
          openOn="hover"
          :appendToBody="false"
          :trigger="`#zoom-in-btn`"
        >
          Zoom in
        </UiTooltip>
      </div>
      <div :class="$computedClass(btnHoverStyle)">
        <KIconButton
          id="close-btn"
          icon="close"
          color="#FFFFFF"
          size="small"
          aria-label="Close"
          @click="closeLightbox"
        />
        <UiTooltip
          :zIndex="24"
          openOn="hover"
          :appendToBody="false"
          :trigger="`#close-btn`"
        >
          Close
        </UiTooltip>
      </div>
    </div>
    <img
      :src="src"
      :alt="alt"
      class="expanded-image"
      :class="styleOverrides.windowSizeClass"
    >
  </dialog>

</template>


<script>

  import UiTooltip from 'kolibri-design-system/lib//keen/UiTooltip.vue';

  export default {
    name: 'Lightbox',
    components: { UiTooltip },
    props: {
      open: {
        type: Boolean,
        required: true,
      },
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
    watch: {
      open(val) {
        if (val) {
          this.$nextTick(() => {
            if (this.$refs.dialogRef) {
              this.$refs.dialogRef.showModal();
              this.$refs.dialogRef.addEventListener('click', this.onBackdropClick);
            }
          });
        } else {
          if (this.$refs.dialogRef) {
            this.$refs.dialogRef.close();
            this.$refs.dialogRef.removeEventListener('click', this.onBackdropClick);
          }
        }
      },
    },
    methods: {
      closeLightbox() {
        this.$emit('closeLightbox');
      },
      // Fallback backdrop click handler for browsers without `closedby` support
      onBackdropClick(e) {
        if (e.target === this.$refs.dialogRef) {
          this.closeLightbox();
        }
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
    z-index: 110;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: end;
    height: 40px;
    padding-right: 8px;
    background-color: #000000;
  }

  .lightbox-dialog {
    position: fixed;
    inset: 40px 0 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    background: none;
    border: 0;
  }

  .lightbox-dialog::backdrop {
    background-color: rgba(51, 51, 51, 0.5);
  }

  .expanded-image {
    position: relative;
    z-index: 110;
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

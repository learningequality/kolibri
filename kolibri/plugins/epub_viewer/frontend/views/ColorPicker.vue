<template>

  <div ref="pickerRoot">
    <div ref="colorPickerEl"></div>
    <div
      ref="pickerBox"
      class="picker-box"
    ></div>
  </div>

</template>


<script>

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import Alwan from 'alwan';
  import 'alwan/dist/css/alwan.min.css';

  export default {
    name: 'ColorPicker',
    setup(props, { emit }) {
      const pickerRoot = ref(null);
      const colorPickerEl = ref(null);
      const pickerBox = ref(null);
      let alwanInstance;

      onMounted(() => {
        alwanInstance = new Alwan(colorPickerEl.value, {
          theme: 'light',
          toggle: false,
          popover: false,
          preset: false,
          color: props.color,
          default: props.color,
          target: pickerBox.value,
          opacity: false,
        });
        alwanInstance.on('change', color => {
          // alwan reports the color as an object; emit only the hex string so the
          // value stays consistent with the string we were initialized with.
          emit('change', color.hex);
        });
        patchAlwanAccessibility(pickerRoot.value);
      });

      onUnmounted(() => {
        if (alwanInstance) {
          alwanInstance.destroy();
        }
      });

      // alwan ships two a11y defects in its own markup that it does not expose
      // through its API, and that axe flags. Patch them once the widget has
      // rendered:
      //  - its 2D spectrum is a focusable div carrying an aria-label but no role
      //    (aria-prohibited-attr); give it a role that legitimately accepts a name.
      //  - its control icons use the invalid attribute aria-role="none"
      //    (aria-valid-attr); replace it with aria-hidden so AT skips the
      //    decorative svgs.
      function patchAlwanAccessibility(root) {
        nextTick(() => {
          const palette = root.querySelector('.alwan__palette');
          if (palette && !palette.hasAttribute('role')) {
            palette.setAttribute('role', 'application');
          }
          root.querySelectorAll('svg[aria-role]').forEach(svg => {
            svg.removeAttribute('aria-role');
            svg.setAttribute('aria-hidden', 'true');
          });
        });
      }

      return {
        pickerRoot,
        colorPickerEl,
        pickerBox,
      };
    },
    props: {
      color: {
        type: String,
        default: '#000000',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .picker-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }

</style>

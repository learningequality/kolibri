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
  import 'alwan/css';

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
          parent: pickerBox.value,
          opacity: false,
        });
        patchAlwanAccessibility(pickerRoot.value);
        alwanInstance.on('change', color => {
          // alwan reports the color as an object; emit only the hex string so the
          // value stays consistent with the string we were initialized with.
          emit('change', color.hex);
        });
      });

      onUnmounted(() => {
        if (alwanInstance) {
          alwanInstance.destroy();
        }
      });

      // Alwan does not expose these elements through its API, so we patch its DOM
      // to fix two axe violations:
      //  - .alwan__selector is a focusable div with an aria-label but no role
      //    (aria-prohibited-attr); give it a role so assistive technology can
      //    interpret the color picker correctly.
      //  - its control icons use the invalid attribute aria-role="none"
      //    (aria-valid-attr); replace it with aria-hidden so AT skips the
      //    decorative svgs.
      function patchAlwanAccessibility(root) {
        nextTick(() => {
          const selector = root.querySelector('.alwan__selector');
          if (selector && !selector.hasAttribute('role')) {
            selector.setAttribute('role', 'application');
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

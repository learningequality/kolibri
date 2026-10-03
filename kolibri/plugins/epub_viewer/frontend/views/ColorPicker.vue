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

  import { ref, onMounted, onUnmounted } from 'vue';
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
          preset: false,
          color: props.color,
          default: props.color,
          parent: pickerBox.value,
          opacity: false,
        });
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

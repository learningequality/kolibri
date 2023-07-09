<template>

  <KModal
    :title="title"
    :submitText="$tr('selectAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit', selectedColor)"
    @cancel="$emit('cancel')"
  >
    <div id="color-picker"></div>
    <div class="picker-box"></div>

  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import Alwan from 'alwan'
  import 'alwan/dist/css/alwan.min.css'

  export default {
    name: 'ColorPickerModal',
    mixins: [commonCoreStrings],
    props: {
      colorPicker: {
        type: String,
        default: null,
      },
      color: {
        type: String,
        default: '#000000',
      },
    },
    data() {
      return {
        selectedColor: this.color,
      };
    },
    computed: {
      title() {
        if (this.colorPicker == 'background') {
          return this.$tr('titleSelectBackground');
        }
        if (this.colorPicker == 'text') {
          return this.$tr('titleSelectText');
        }
        if (this.colorPicker == 'link') {
          return this.$tr('titleSelectLink');
        } else {
          return this.$tr('titleSelectColor');
        }
      },
    },
    mounted() {
      const alwan = new Alwan('#color-picker',{
          theme: 'light',
          toggle: false,
          popover: false,
          preset: false,
          color: this.color,
          default: this.color,
          target: '.picker-box',
          opacity: false,
      });
      alwan.on('change', (color) => {
        this.selectedColor = color;
      });
    },
    $trs: {
      titleSelectBackground: {
        message: 'Select background color',
        context:
          'Title of window that displays when a user tries to select a new background color.',
      },
      titleSelectText: {
        message: 'Select text color',
        context: 'Title of window that displays when a user tries to select a new text color.',
      },
      titleSelectLink: {
        message: 'Select link color',
        context: 'Title of window that displays when a user tries to select a new link color.',
      },
      titleSelectColor: {
        message: 'Select theme color',
        context: 'Title of window that displays when a user tries to select a new theme color.',
      },
      selectAction: {
        message: 'Select',
        context: 'Button that selects a color.',
      },
    },
  };

</script>


<style lang="scss" scoped>
  .picker-box {
    display: flex;
    justify-content: center;
    align-items: center;
  }

</style>

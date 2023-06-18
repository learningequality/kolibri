<template>
  <KModal 
    :title="title" 
    :submitText="coreString('acceptAction')" 
    :cancelText="coreString('cancelAction')" 
    @submit="$emit('submit', selectedColor)" 
    @cancel="$emit('cancel')"
  >
    <div>
      <Chrome v-model="selectedColor" :disableAlpha="true" />
    </div>

  </KModal>
</template>
  
<script>

import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import { Chrome } from 'vue-color'

export default {
  name: 'ColorPickerModal',
  components: {
    Chrome,
  },
  mixins: [commonCoreStrings],
  props: {
    colorPicker: {
      type: String,
      default: null
    },
    color: {
      type: String,
      default: '#FF0000'
    }
  },
  data() {
    return {
      selectedColor: this.color,
    }
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
      }
      else {
        return this.$tr('titleSelectColor');
      }
    }
  },
  $trs: {
    titleSelectBackground: {
      message: 'Select background color',
      context: 'Title of window that displays when a user tries to select a new background color.',
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
  }
};

</script>
  
  
<style lang="scss" scoped></style>
  
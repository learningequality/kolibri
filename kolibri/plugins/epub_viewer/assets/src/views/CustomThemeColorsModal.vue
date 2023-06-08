<template>

  <KModal
    :title="title"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <div class="theme-preview" :style="{ backgroundColor: backgroundColor, color: textColor }">
      <p>The quick brown fox jumps over the lazy dog. <a :style="{ color: linkColor }">Link</a></p>
    </div>
    
    <!--  -->
    <div :class="{ 'color-select-container-mobile': windowIsSmall }">
      <div class="theme-option">
        <div class="color-box" :style="{ backgroundColor: backgroundColor }"></div>
        <p>Background</p>
      </div>
      <div class="theme-option">
        <div class="color-box" :style="{ backgroundColor: textColor }"></div>
        <p>Text</p>
      </div>
      <div class="theme-option">
        <div class="color-box" :style="{ backgroundColor: linkColor }"></div>
        <p>Link</p>
      </div>
    </div>
    
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';

  export default {
    name: 'CustomThemeColorsModal',
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge, windowIsMedium, windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
      };
    },
    props: {},
    data() {
      return {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        linkColor: '#0000ff',
      };
    },
    computed: {
      title() {
        return this.$tr('titleAddTheme');
      },
    },
    $trs: {
      titleAddTheme: {
        message: 'Add New Theme',
        context: 'Title of window that displays when a user tries to add a new custom theme.',
      }
    },
  };

</script>


<style lang="scss" scoped>
  .theme-preview {
    margin: 24px;
    padding: 24px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  .theme-option {
    text-align: center;
    float: left;
    width: 33.33%;
    padding: 10px;
  }
  .color-box {
    width: 75px;
    height: 6vh;
    margin: 0 auto;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  .color-select-container-mobile {
    display: flex;
    flex-direction: column;
  }
  .color-select-container-mobile .theme-option {
    display: flex;
    flex-direction: row-reverse;
    width: 100%;
    margin-left: 10px;
  }
  .color-select-container-mobile .theme-option .color-box {
    margin-right: 10px;
  }
</style>

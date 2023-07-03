<template>

  <div>
    <div v-if="colorPicker === null">
      <KModal
        :title="title"
        :submitText="coreString('saveAction')"
        :cancelText="coreString('cancelAction')"
        @submit="handleSubmit"
        @cancel="$emit('cancel')"
      >
        <div class="theme-name">
          <ThemeNameTextbox
            ref="themeNameTextbox"
            :autofocus="false"
            :value.sync="tempTheme.name"
            :isValid.sync="themeNameIsValid"
            :shouldValidate="formSubmitted"
          />
          <!-- TODO: autofocus true or false? -->
        </div>

        <h3>{{ $tr('themePreview') }}</h3>
        <div
          class="theme-preview"
          :style="{ backgroundColor: tempTheme.backgroundColor, color: tempTheme.textColor }"
        >
          <p>
            The quick brown fox jumps over the lazy dog.
            <a :style="{ color: tempTheme.linkColor }">This is a link</a>
            <!-- TODO: do this need translations too? -->
          </p>
        </div>

        <div :class="{ 'color-select-container-mobile': windowIsSmall }">
          <div class="theme-option">
            <div class="color-box">
              <KButton
                :appearanceOverrides="generateStyle(tempTheme.backgroundColor)"
                @click="colorPicker = 'background'"
              />
            </div>
            <p>{{ $tr('buttonBackground') }}</p>
          </div>
          <div class="theme-option">
            <div class="color-box">
              <KButton
                :appearanceOverrides="generateStyle(tempTheme.textColor)"
                @click="colorPicker = 'text'"
              />
            </div>
            <p>{{ $tr('buttonText') }}</p>
          </div>
          <div class="theme-option">
            <div class="color-box">
              <KButton
                :appearanceOverrides="generateStyle(tempTheme.linkColor)"
                @click="colorPicker = 'link'"
              />
            </div>
            <p>{{ $tr('buttonLink') }}</p>
          </div>
        </div>
      </KModal>
    </div>
    <div v-if="colorPicker !== null">
      <ColorPickerModal
        :colorPicker="colorPicker"
        :color="tempTheme[colorPicker + 'Color']"
        @submit="setThemeColor($event)"
        @cancel="colorPicker = null"
      />
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import ThemeNameTextbox from './ThemeNameTextBox.vue';
  import ColorPickerModal from './ColorPickerModal.vue';

  export default {
    name: 'CustomThemeColorsModal',
    components: {
      ThemeNameTextbox,
      ColorPickerModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge, windowIsMedium, windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsLarge,
        windowIsMedium,
        windowIsSmall,
      };
    },
    props: {
      modalMode: {
        type: String,
        default: null,
      },
      theme: {
        type: Object,
        default: () => {
          return {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            linkColor: '#0000ff',
          };
        },
      },
    },
    data() {
      return {
        tempTheme: {
          name: this.modalMode == 'edit' ? this.theme.name : '',
          backgroundColor: this.theme.backgroundColor,
          textColor: this.theme.textColor,
          linkColor: this.theme.linkColor,
        },
        colorPicker: null,
        themeNameIsValid: false,
        formSubmitted: false,
      };
    },
    computed: {
      title() {
        if (this.modalMode == 'add') {
          return this.$tr('titleAddTheme');
        } else if (this.modalMode == 'edit') {
          return this.$tr('titleEditTheme');
        } else {
          return this.$tr('titleNewTheme');
          // NOTE: This message is not supposed to be displayed in the current implementation
        }
      },
    },
    methods: {
      generateStyle(bgColor) {
        return {
          backgroundColor: bgColor,
          height: '100%',
          width: '100%',
          transition: 'box-shadow 0.3s ease-in-out',
          ':hover': {
            backgroundColor: bgColor,
            opacity: 0.9,
            boxShadow: '0 1px 4px',
          },
        };
      },
      setThemeColor(color) {
        if (this.colorPicker == 'background') {
          this.tempTheme.backgroundColor = color.hex;
        } else if (this.colorPicker == 'text') {
          this.tempTheme.textColor = color.hex;
        } else if (this.colorPicker == 'link') {
          this.tempTheme.linkColor = color.hex;
        }
        this.colorPicker = null;
      },
      handleSubmit() {
        this.formSubmitted = true;
        if (this.themeNameIsValid) {
          this.$emit('submit', this.tempTheme);
        } else {
          this.$nextTick().then(() => {
            this.$refs.themeNameTextbox.focus();
          });
        }
      },
    },
    $trs: {
      titleAddTheme: {
        message: 'Add new theme',
        context: 'Title of window that displays when a user tries to add a new custom theme.',
      },
      titleEditTheme: {
        message: 'Edit theme',
        context:
          'Title of window that displays when a user tries to edit an existing custom theme.',
      },
      titleNewTheme: {
        message: 'New theme',
        context:
          'Title of window that displays when a user tries to not adding or editing a custom theme.',
        // NOTE: This message is not supposed to be displayed in the current implementation
      },
      buttonBackground: {
        message: 'Background',
        context: '',
      },
      buttonText: {
        message: 'Text',
        context: '',
      },
      buttonLink: {
        message: 'Link',
        context: '',
      },
      themePreview: {
        message: 'Theme preview',
        context: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .theme-name {
    margin: 24px;
  }

  .theme-preview {
    padding: 24px;
    margin: 12px 24px;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  h3 {
    margin: 0 24px;
  }

  .theme-option {
    float: left;
    width: 33.33%;
    padding: 10px;
    text-align: center;
  }

  .color-box {
    width: 75px;
    height: 6vh;
    margin: 0 auto;
    border: 1px solid #cccccc;
    border-radius: 4px;
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

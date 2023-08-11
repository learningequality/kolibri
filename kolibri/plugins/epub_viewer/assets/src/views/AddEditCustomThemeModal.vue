<template>

  <div>
    <!-- Modal of theme options -->
    <KModal
      v-if="!showColorPicker"
      :title="generateTitle"
      :submitText="coreString('saveAction')"
      :cancelText="coreString('cancelAction')"
      :disabled="submitting"
      @submit="handleSubmit"
      @cancel="$emit('cancel')"
    >

      <KTextbox
        ref="customThemeName"
        v-model.trim="customThemeName"
        class="theme-name"
        type="text"
        :label="$tr('customThemeNameLabel')"
        :autofocus="false"
        :disabled="submitting"
        :invalid="customThemeNameIsInvalid"
        :invalidText="customThemeNameIsInvalidText"
        :maxlength="50"
        @blur="customThemeNameBlurred = true"
      />

      <UiAlert
        v-if="showUIAlert"
        :dismissible="false"
        :removeIcon="true"
        type="warning"
        :style="{ margin: '8px 24px 12px 24px', width: 'auto' }"
      >
        {{ $tr('signIn') }}
      </UiAlert>

      <h2 id="theme-preview-h3">
        {{ $tr('customThemePreview') }}
      </h2>

      <div
        class="theme-preview"
        :style="{ backgroundColor: tempTheme.backgroundColor, color: tempTheme.textColor }"
      >
        <h3>{{ $tr('thisIsASampleText') }}</h3>
        <p>
          The quick brown fox jumps over the lazy dog.
          <a :style="{ color: tempTheme.linkColor }">{{ $tr('linkPreviewText') }}</a>
        </p>
      </div>

      <div :class="{ 'color-select-container-mobile': windowIsSmall }">
        <div class="theme-option-container">
          <KButton
            ref="backgroundColorButton"
            class="theme-color-button"
            :aria-label="generateAriaLabel($tr('themeBackgroundColorButtonDescription'))"
            :appearanceOverrides="themeColorOptionStyles(tempTheme.backgroundColor)"
            @click="showColorPicker = 'backgroundColor'"
          />
          <p>{{ $tr('themeBackgroundColorButtonDescription') }}</p>
        </div>

        <div class="theme-option-container">
          <KButton
            ref="textColorButton"
            class="theme-color-button"
            :aria-label="generateAriaLabel($tr('themeTextColorButtonDescription'))"
            :appearanceOverrides="themeColorOptionStyles(tempTheme.textColor)"
            @click="showColorPicker = 'textColor'"
          />
          <p>{{ $tr('themeTextColorButtonDescription') }}</p>
        </div>

        <div class="theme-option-container">
          <KButton
            ref="linkColorButton"
            class="theme-color-button"
            :aria-label="generateAriaLabel($tr('themeLinkColorButtonDescription'))"
            :appearanceOverrides="themeColorOptionStyles(tempTheme.linkColor)"
            @click="showColorPicker = 'linkColor'"
          />
          <p>{{ $tr('themeLinkColorButtonDescription') }}</p>
        </div>
      </div>

    </KModal>

    <!-- modal of color picker -->
    <ColorPickerModal
      v-if="showColorPicker"
      :colorPicker="showColorPicker"
      :color="tempTheme[showColorPicker]"
      @submit="handleColorPickerSubmit($event)"
      @cancel="handleColorPickerCancel"
    />

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import Lockr from 'lockr';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';
  import { mapGetters } from 'vuex';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import ColorPickerModal from './ColorPickerModal';

  export default {
    name: 'AddEditCustomThemeModal',
    components: {
      ColorPickerModal,
      UiAlert,
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
        required: true,
      },
      theme: {
        type: Object,
        required: true,
      },
      themeName: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        customThemeName: this.themeName,
        customThemeNameBlurred: false,
        submitting: false,
        formSubmitted: false,
        tempTheme: {
          backgroundColor: this.theme.backgroundColor,
          textColor: this.theme.textColor,
          linkColor: this.theme.linkColor || '#0000EE', //because fixed themes dont have a link color
        },
        showColorPicker: null,
        existingCustomThemeNames: [],
        showUIAlert: false,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      generateTitle() {
        if (this.modalMode === 'add') {
          return this.$tr('addCustomThemeTitle');
        } else if (this.modalMode === 'edit') {
          return this.$tr('editCustomThemeTitle');
        } else {
          return ''; // not supposed to happen
        }
      },
      customThemeNameIsInvalidText() {
        if (!this.formSubmitted) {
          if (this.customThemeName === '') {
            return this.coreString('requiredFieldError');
          }
          if (this.existingCustomThemeNames.includes(this.customThemeName)) {
            return this.$tr('duplicateCustomThemeName');
          }
        }
        return '';
      },
      customThemeNameIsInvalid() {
        return Boolean(this.customThemeNameIsInvalidText);
      },
      formIsValid() {
        return !this.customThemeNameIsInvalid;
      },
    },
    mounted() {
      this.existingCustomThemeNames = Object.keys(
        Lockr.get('kolibriEpubRendererCustomThemes') || {}
      );
      //if the modalMode is 'edit',
      //remove the name of the theme being edited from the list of existing names
      if (this.modalMode === 'edit') {
        const selectedThemeIndex = this.existingCustomThemeNames.indexOf(this.themeName);
        this.existingCustomThemeNames.splice(selectedThemeIndex, 1);
      }
      this.$refs.customThemeName.focus();
    },
    methods: {
      handleSubmit() {
        this.submitting = true;
        if (this.formIsValid && this.isUserLoggedIn) {
          this.formSubmitted = true;
          this.$emit('submit', { ...this.tempTheme, name: this.customThemeName });
        } else {
          this.showUIAlert = !this.isUserLoggedIn;
          this.submitting = false;
          this.$refs.customThemeName.focus();
        }
      },
      handleColorPickerCancel() {
        const buttonRef = this.showColorPicker + 'Button';
        this.showColorPicker = null;
        this.$nextTick(() => {
          this.$refs[buttonRef].$refs.button.focus();
        });
      },
      handleColorPickerSubmit(color) {
        this.setThemeColor(color);
        const buttonRef = this.showColorPicker + 'Button';
        this.showColorPicker = null;
        this.$nextTick(() => {
          this.$refs[buttonRef].$refs.button.focus();
        });
      },
      themeColorOptionStyles(bgColor) {
        return {
          backgroundColor: bgColor,
          ':hover': {
            backgroundColor: bgColor,
            opacity: 0.9,
            boxShadow: '0 1px 4px',
          },
        };
      },
      setThemeColor(color) {
        if (this.showColorPicker == 'backgroundColor') {
          this.tempTheme.backgroundColor = color.hex;
        } else if (this.showColorPicker == 'textColor') {
          this.tempTheme.textColor = color.hex;
        } else if (this.showColorPicker == 'linkColor') {
          this.tempTheme.linkColor = color.hex;
        }
      },
      generateAriaLabel(color) {
        if (color === 'Background') {
          return this.$tr('selectBackgroundColor');
        } else if (color === 'Text') {
          return this.$tr('selectTextColor');
        } else if (color === 'Links') {
          return this.$tr('selectLinkColor');
        }
      },
    },
    $trs: {
      customThemePreview: {
        message: 'Theme preview',
        context: 'Heading for the preview of the custom theme that is being created or edited',
      },
      themeBackgroundColorButtonDescription: {
        message: 'Background',
        context: 'Description of the button to change the background color of the custom theme',
      },
      themeTextColorButtonDescription: {
        message: 'Text',
        context: 'Description of the button to change the text color of the custom theme',
      },
      themeLinkColorButtonDescription: {
        message: 'Links',
        context: 'Description of the button to change the link color of the custom theme',
      },
      addCustomThemeTitle: {
        message: 'Add new theme',
        context: 'Title of the modal to add a new custom theme',
      },
      editCustomThemeTitle: {
        message: 'Edit theme',
        context: 'Title of the modal to edit an existing custom theme',
      },
      duplicateCustomThemeName: {
        message: 'A theme with this name already exists',
        context: 'Error message when trying to add a custom theme with a name that already exists',
      },
      customThemeNameLabel: {
        message: 'Theme name',
        context: 'Label for the textbox to enter the name of the custom theme',
      },
      signIn: {
        message: 'Sign in or create an account to save your new theme',
        context:
          'Message that a learner will see upon trying to save a custom theme if they are not signed in to Kolibri.',
      },
      selectBackgroundColor: {
        message: 'Select background color',
        context: 'Aria label for the button to select the background color of the custom theme',
      },
      selectTextColor: {
        message: 'Select text color',
        context: 'Aria label for the button to select the text color of the custom theme',
      },
      selectLinkColor: {
        message: 'Select link color',
        context: 'Aria label for the button to select the link color of the custom theme',
      },
      linkPreviewText: {
        message: 'This is a link',
        context: 'Text that is a link in the preview of the custom theme',
      },
      thisIsASampleText: {
        message: 'This is a sample text.',
        context: 'Language specific sample text in the preview of the custom theme',
      },
    },
  };

</script>


<style>

  .theme-name {
    margin: 24px;
  }

  .theme-preview {
    padding: 24px;
    margin: 12px 24px;
    border: 1px solid #cccccc;
    border-radius: 4px;
  }

  #theme-preview-h2 {
    margin: 0 24px;
  }

  .theme-option-container {
    float: left;
    width: 33.33%;
    padding: 10px;
    text-align: center;
  }

  .theme-color-button {
    width: 75px;
    height: 6vh;
    margin: 0 auto;
    border: 1px solid #cccccc;
    border-radius: 4px;
    transition: 'box-shadow 0.3s ease-in-out';
  }

  .color-select-container-mobile {
    display: flex;
    flex-direction: column;
    width: 90%;
    margin: auto;
  }

  .color-select-container-mobile .theme-option-container {
    display: flex;
    flex-direction: row-reverse;
    width: 100%;
    margin-left: 10px;
  }

  .color-select-container-mobile .theme-option-container .theme-color-button {
    margin-right: 10px;
  }

</style>

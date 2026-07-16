<template>

  <!-- A single KModal hosts both the theme form and the color picker, swapping its
       content rather than mounting a second modal. Mounting a second KModal makes
       its overlay fade in from transparent while the first is removed at full
       opacity, which reads as a white flash between the two. -->
  <KModal
    :title="modalTitle"
    :submitText="modalSubmitText"
    :cancelText="coreString('cancelAction')"
    :disabled="!showColorPicker && submitting"
    @submit="handleModalSubmit"
    @cancel="handleModalCancel"
  >
    <template v-if="!showColorPicker">
      <KTextbox
        ref="customThemeNameTextbox"
        v-model.trim="customThemeName"
        class="theme-name"
        type="text"
        :label="customThemeNameLabel$()"
        :autofocus="false"
        :disabled="submitting"
        :invalid="customThemeNameIsInvalid"
        :invalidText="customThemeNameIsInvalidText"
        :maxlength="maxThemeNameLength"
      />

      <h2 class="theme-preview-heading">
        {{ customThemePreview$() }}
      </h2>

      <div
        class="theme-preview"
        role="img"
        :aria-label="customThemePreview$()"
        :style="{
          backgroundColor: tempTheme.backgroundColor,
          color: tempTheme.textColor,
          borderColor: $themeTokens.fineLine,
        }"
      >
        <h3>{{ thisIsASampleText$() }}</h3>
        <p>
          {{ samplePreviewText$() }}
          <a :style="{ color: tempTheme.linkColor }">{{ linkPreviewText$() }}</a>
        </p>
      </div>

      <div
        class="color-select-container"
        :class="{ 'color-select-container-mobile': windowIsSmall }"
      >
        <div class="theme-option-container">
          <KButton
            ref="backgroundColorButton"
            class="theme-color-button"
            :aria-label="selectBackgroundColor$()"
            :appearanceOverrides="
              themeColorOptionStyles(tempTheme.backgroundColor, $themeTokens.fineLine)
            "
            @click="openColorPicker('backgroundColor')"
          />
          <p>{{ themeBackgroundColorButtonDescription$() }}</p>
        </div>

        <div class="theme-option-container">
          <KButton
            ref="textColorButton"
            class="theme-color-button"
            :aria-label="selectTextColor$()"
            :appearanceOverrides="
              themeColorOptionStyles(tempTheme.textColor, $themeTokens.fineLine)
            "
            @click="openColorPicker('textColor')"
          />
          <p>{{ themeTextColorButtonDescription$() }}</p>
        </div>

        <div class="theme-option-container">
          <KButton
            ref="linkColorButton"
            class="theme-color-button"
            :aria-label="selectLinkColor$()"
            :appearanceOverrides="
              themeColorOptionStyles(tempTheme.linkColor, $themeTokens.fineLine)
            "
            @click="openColorPicker('linkColor')"
          />
          <p>{{ themeLinkColorButtonDescription$() }}</p>
        </div>
      </div>
    </template>

    <ColorPicker
      v-else
      :color="tempTheme[showColorPicker]"
      @change="pendingColor = $event"
    />
  </KModal>

</template>


<script>

  import { computed, ref, onMounted, nextTick } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import useCustomThemes from '../composables/useCustomThemes';
  import { DEFAULT_LINK_COLOR, MAX_THEME_NAME_LENGTH, deriveHoverColor } from './EpubConstants';
  import { customThemeStrings } from './customThemeStrings';
  import ColorPicker from './ColorPicker';

  export default {
    name: 'AddEditCustomThemeModal',
    components: {
      ColorPicker,
    },
    setup(props, { emit }) {
      const { windowIsSmall } = useKResponsiveWindow();
      const { isDuplicateName } = useCustomThemes();
      const {
        addCustomThemeTitle$,
        editCustomThemeTitle$,
        addAction$,
        customThemeNameLabel$,
        duplicateCustomThemeName$,
        customThemePreview$,
        thisIsASampleText$,
        samplePreviewText$,
        linkPreviewText$,
        themeBackgroundColorButtonDescription$,
        themeTextColorButtonDescription$,
        themeLinkColorButtonDescription$,
        selectBackgroundColor$,
        selectTextColor$,
        selectLinkColor$,
        titleSelectBackground$,
        titleSelectText$,
        titleSelectLink$,
        titleSelectColor$,
        selectAction$,
      } = customThemeStrings;

      const customThemeName = ref(props.themeName);
      const submitting = ref(false);
      const formSubmitted = ref(false);
      const tempTheme = ref({
        backgroundColor: props.theme.backgroundColor,
        textColor: props.theme.textColor,
        linkColor: props.theme.linkColor || DEFAULT_LINK_COLOR,
      });
      // The color field currently being picked (backgroundColor/textColor/linkColor),
      // or null when the theme form is shown.
      const showColorPicker = ref(null);
      // Latest hex emitted by the color picker, applied to tempTheme on confirm.
      const pendingColor = ref(null);
      // In edit mode the theme's own name must not flag itself as a duplicate.
      const excludeNameId = props.modalMode === 'edit' ? props.theme.id : null;

      // Template refs
      const customThemeNameTextbox = ref(null);
      const backgroundColorButton = ref(null);
      const textColorButton = ref(null);
      const linkColorButton = ref(null);
      const colorButtonRefs = {
        backgroundColor: backgroundColorButton,
        textColor: textColorButton,
        linkColor: linkColorButton,
      };

      const generateTitle = computed(() => {
        if (props.modalMode === 'add') {
          return addCustomThemeTitle$();
        } else if (props.modalMode === 'edit') {
          return editCustomThemeTitle$();
        }
        return ''; // not supposed to happen
      });
      // A new theme is applied the moment it's added, so the add-mode button reads
      // "Add" rather than "Save"; editing an existing theme keeps "Save".
      const submitText = computed(() =>
        props.modalMode === 'add' ? addAction$() : coreString('saveAction'),
      );
      const pickerTitle = computed(() => {
        if (showColorPicker.value === 'backgroundColor') return titleSelectBackground$();
        if (showColorPicker.value === 'textColor') return titleSelectText$();
        if (showColorPicker.value === 'linkColor') return titleSelectLink$();
        return titleSelectColor$();
      });
      // The single modal shows the picker's title/button while a color is being
      // picked, and the theme form's otherwise.
      const modalTitle = computed(() =>
        showColorPicker.value ? pickerTitle.value : generateTitle.value,
      );
      const modalSubmitText = computed(() =>
        showColorPicker.value ? selectAction$() : submitText.value,
      );
      const customThemeNameIsInvalidText = computed(() => {
        if (!formSubmitted.value) {
          if (customThemeName.value === '') {
            return coreString('requiredFieldError');
          }
          if (isDuplicateName(customThemeName.value, excludeNameId)) {
            return duplicateCustomThemeName$();
          }
        }
        return '';
      });
      const customThemeNameIsInvalid = computed(() => Boolean(customThemeNameIsInvalidText.value));
      const formIsValid = computed(() => !customThemeNameIsInvalid.value);

      onMounted(() => {
        customThemeNameTextbox.value.focus();
      });

      function openColorPicker(field) {
        // Seed the pending color so confirming without touching the picker keeps
        // the field's current value.
        pendingColor.value = tempTheme.value[field];
        showColorPicker.value = field;
      }
      function restoreColorButtonFocus() {
        const buttonRef = colorButtonRefs[showColorPicker.value];
        showColorPicker.value = null;
        nextTick(() => {
          buttonRef.value.$el.focus();
        });
      }
      function confirmColor() {
        // Rewrite the whole object rather than mutating a key, so a plain ref suffices.
        tempTheme.value = { ...tempTheme.value, [showColorPicker.value]: pendingColor.value };
        restoreColorButtonFocus();
      }
      // The modal's submit/cancel drive either the picker or the form depending on
      // which content is showing.
      function handleModalSubmit() {
        if (showColorPicker.value) {
          confirmColor();
        } else {
          handleSubmit();
        }
      }
      function handleModalCancel() {
        if (showColorPicker.value) {
          restoreColorButtonFocus();
        } else {
          emit('cancel');
        }
      }
      function handleSubmit() {
        submitting.value = true;
        if (formIsValid.value) {
          formSubmitted.value = true;
          emit('submit', {
            ...tempTheme.value,
            name: customThemeName.value,
            hoverColor: deriveHoverColor(tempTheme.value.backgroundColor),
          });
        } else {
          submitting.value = false;
          customThemeNameTextbox.value.focus();
        }
      }
      function themeColorOptionStyles(bgColor, borderColor) {
        return {
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          ':hover': {
            backgroundColor: bgColor,
            opacity: 0.9,
            boxShadow: '0 1px 4px',
          },
        };
      }

      return {
        coreString,
        windowIsSmall,
        maxThemeNameLength: MAX_THEME_NAME_LENGTH,
        customThemeName,
        submitting,
        tempTheme,
        showColorPicker,
        pendingColor,
        customThemeNameTextbox,
        backgroundColorButton,
        textColorButton,
        linkColorButton,
        modalTitle,
        modalSubmitText,
        customThemeNameIsInvalid,
        customThemeNameIsInvalidText,
        openColorPicker,
        handleModalSubmit,
        handleModalCancel,
        themeColorOptionStyles,
        customThemeNameLabel$,
        customThemePreview$,
        thisIsASampleText$,
        samplePreviewText$,
        linkPreviewText$,
        themeBackgroundColorButtonDescription$,
        themeTextColorButtonDescription$,
        themeLinkColorButtonDescription$,
        selectBackgroundColor$,
        selectTextColor$,
        selectLinkColor$,
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
  };

</script>


<style lang="scss" scoped>

  .theme-name {
    margin: 24px;
  }

  .theme-preview {
    padding: 24px;
    margin: 12px 24px;
    border-style: solid;
    border-width: 1px;
    border-radius: 4px;
  }

  .theme-preview-heading {
    margin: 0 24px;
  }

  .color-select-container {
    display: flex;
  }

  .theme-option-container {
    flex: 1;
    padding: 10px;
    text-align: center;
  }

  .theme-color-button {
    width: 75px;
    height: 48px;
    margin: 0 auto;
    border-radius: 4px;
    transition: box-shadow 0.3s ease-in-out;
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

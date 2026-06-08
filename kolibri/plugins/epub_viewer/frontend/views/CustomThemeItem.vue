<template>

  <div class="theme-item">
    <KButton
      ref="colorButton"
      class="theme-color-button"
      :aria-label="setCustomTheme$({ themeName: theme.name })"
      :appearanceOverrides="themeStyle($coreOutline)"
      @click="$emit('setCustomTheme', theme)"
    >
      <div class="theme-color-button-content">
        <KIcon
          v-if="isApplied"
          icon="check"
          :style="{ fill: appliedIndicatorColor }"
          class="applied-icon"
        />
        <div class="truncate">{{ theme.name }}</div>
      </div>
    </KButton>

    <KButton
      ref="editButton"
      appearance="flat-button"
      :aria-label="editCustomTheme$({ themeName: theme.name })"
      :text="edit$()"
      @click="$emit('editCustomTheme', theme)"
    />

    <KButton
      ref="deleteButton"
      appearance="flat-button"
      :aria-label="deleteCustomTheme$({ themeName: theme.name })"
      :text="delete$()"
      @click="$emit('deleteCustomTheme', theme)"
    />
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { customThemeStrings } from './customThemeStrings';
  import { isDarkColor } from './EpubConstants';

  export default {
    name: 'CustomThemeItem',
    setup(props) {
      const { setCustomTheme$, deleteCustomTheme$, editCustomTheme$, delete$, edit$ } =
        customThemeStrings;

      // The applied-state check and outline must contrast with the swatch
      // background, not the theme's text color — otherwise a theme whose text
      // color is close to its background (a valid choice) would hide them.
      const appliedIndicatorColor = computed(() =>
        isDarkColor(props.theme.backgroundColor) ? '#ffffff' : '#212121',
      );

      // coreOutline is passed from the template, where $coreOutline is available,
      // so the component doesn't depend on Vue's getCurrentInstance escape hatch.
      function themeStyle(coreOutline) {
        return {
          ':focus': {
            ...coreOutline,
            outlineOffset: '0px',
            outlineWidth: '2px',
          },
          backgroundColor: props.theme.backgroundColor,
          color: props.theme.textColor,
          // Mark the applied theme with a bold inset ring that contrasts with the
          // swatch, so selection reads at a glance alongside the checkmark. Inset
          // (not a border) avoids shifting the swatch's fixed dimensions.
          ...(props.isApplied
            ? { boxShadow: `inset 0 0 0 3px ${appliedIndicatorColor.value}` }
            : {}),
          ':hover': {
            backgroundColor: props.theme.hoverColor,
          },
        };
      }

      return {
        themeStyle,
        appliedIndicatorColor,
        setCustomTheme$,
        deleteCustomTheme$,
        editCustomTheme$,
        delete$,
        edit$,
      };
    },
    props: {
      theme: {
        type: Object,
        required: true,
      },
      isApplied: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .theme-item {
    display: flex;
    align-items: center;
    margin-top: 16px;
  }

  .truncate {
    max-width: 100%;
    @include truncate-text;
  }

  .theme-color-button {
    flex: 1;
    min-width: 0;
    height: 64px;
    padding: 8px;
    margin: 2px;
    border-radius: 8px;
  }

  // Stack the applied check above the name, centered, so neither overflows the
  // fixed-height swatch (mirrors the fixed-theme buttons in SettingsSideBar).
  .theme-color-button-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .applied-icon {
    top: 0;
    width: 24px;
    height: 24px;
  }

</style>

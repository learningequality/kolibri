<template>

  <div style="margin: 16px 0 0 0;">
    <KButton
      ref="colorButton"
      class="theme-color-button"
      :aria-label="generateCustomThemeAriaLabel(theme.name)"
      :appearanceOverrides="generateStyle(theme)"
      :text="generateThemeNameToDisplay(theme.name)"
      :icon="isApplied ? 'check' : ''"
      @click="$emit('setCustomTheme', theme)"
    />

    <KButton
      ref="deleteButton"
      class="theme-settings-button"
      :aria-label="generateCustomThemeDeleteAriaLabel(theme.name)"
      :text="$tr('delete')"
      :icon="'trash'"
      style="marginLeft: 16px; marginRight: 16px;"
      @click="$emit('deleteCustomTheme', theme)"
    />

    <KButton
      ref="editButton"
      class="theme-settings-button"
      :aria-label="generateCustomThemeEditAriaLabel(theme.name)"
      :text="$tr('edit')"
      :icon="'edit'"
      @click="$emit('editCustomTheme', theme)"
    />
  </div>

</template>


<script>

  export default {
    name: 'CustomThemeItem',
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
    methods: {
      generateStyle(theme) {
        return {
          ...this.settingsButtonFocus,
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          ':hover': {
            backgroundColor: theme.hoverColor,
          },
        };
      },
      generateCustomThemeAriaLabel(themeName) {
        return this.$tr('setCustomTheme', { themeName });
      },
      generateCustomThemeDeleteAriaLabel(themeName) {
        return this.$tr('deleteCustomTheme', { themeName });
      },
      generateCustomThemeEditAriaLabel(themeName) {
        return this.$tr('editCustomTheme', { themeName });
      },
      generateThemeNameToDisplay(themeName) {
        if (themeName.length > 10) {
          return themeName.substring(0, 10) + '...';
        }
        return themeName;
      },
    },
    $trs: {
      delete: {
        message: 'Delete',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'Custom Themes' option. This button allows learners to delete a theme.",
      },
      edit: {
        message: 'Edit',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'Custom Themes' option. This button allows learners to edit a theme.",
      },
      setCustomTheme: {
        message: "Set custom theme '{themeName}'",
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'My themes' option. In this case it can be set to {themeName}.",
      },
      deleteCustomTheme: {
        message: "Delete custom theme '{themeName}'",
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'My themes' option. In this case it can be deleted.",
      },
      editCustomTheme: {
        message: "Edit custom theme '{themeName}'",
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'My themes' option. In this case it can be edited.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .theme-color-button {
    width: calc(50% - 4px);
    height: 64px;
    padding: 8px;
    margin: 2px;
    border-style: solid;
    border-width: 2px;
    border-radius: 8px;
  }

  .theme-settings-button {
    width: calc(25% - 16px);
    min-width: unset;
    height: 64px;
    padding: 8px;
    line-height: unset;
    border-color: black !important;
    border-style: solid !important;
    border-width: 2px;
    border-radius: 8px;
    transition: none;
  }

</style>

<template>

  <SideBar class="epub-sidebar">
    <div class="o-f-h">
      <h3>{{ $tr('textSize') }}</h3>
      <KFixedGrid numCols="2" gutter="8">
        <KFixedGridItem span="1">
          <KButton
            ref="decreaseFontSizeButton"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            :disabled="decreaseFontSizeDisabled"
            @click="$emit('decreaseFontSize')"
          >
            <template #icon>
              <KIcon icon="minus" style="top: 0; width: 24px; height: 24px;" />
            </template>
            <div class="truncate">
              {{ $tr('decrease') }}
            </div>
          </KButton>
        </KFixedGridItem>
        <KFixedGridItem span="1">
          <KButton
            ref="increaseFontSizeButton"
            :disabled="increaseFontSizeDisabled"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            @click="$emit('increaseFontSize')"
          >
            <template #icon>
              <KIcon icon="plus" style="top: 0; width: 24px; height: 24px;" />
            </template>
            <div class="truncate">
              {{ $tr('increase') }}
            </div>
          </KButton>
        </KFixedGridItem>
      </KFixedGrid>
    </div>

    <div class="o-f-h">
      <h3>{{ $tr('theme') }}</h3>
      <KFixedGrid numCols="3" gutter="16">
        <KFixedGridItem
          v-for="(value, key) in themes"
          :key="key"
          span="1"
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="generateThemeAriaLabel(key)"
            :appearanceOverrides="generateStyle(value)"
            :text="key"
            @click="$emit('setTheme', value)"
          >
            <div style="display: flex; flex-direction: row; justify-content: center;">
              <KIcon
                v-if="isCurrentlySelectedTheme(value) "
                icon="check"
                :style="{ fill: value.textColor }"
                style="top: 0; width: 24px; height: 24px;"
              />
            </div>
          </KButton>

        </KFixedGridItem>
      </KFixedGrid>
    </div>

    <div class="o-f-h">
      <h3>{{ $tr('customTheme') }}</h3>
      <KFixedGrid numCols="4" gutter="8">
        <!-- Buttons for already created custom themes -->
        <KFixedGridItem
          v-for="(value, key) in customThemes"
          :key="key"
          span="1"
          style="margin-bottom: 8px;"
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="generateCustomThemeAriaLabel(key)"
            :appearanceOverrides="generateStyle(value)"
            @click="$emit('setTheme', value)"
          >
            <KIcon
              v-if="isCurrentlySelectedTheme(value) "
              icon="check"
              :style="{ fill: value.textColor }"
              style="top: 0; width: 24px; height: 24px;"
            />
          </KButton>
          <KButton
            class="delete-edit-button"
            :aria-label="generateCustomThemeDeleteAriaLabel(key)"
            :text="$tr('delete')"
            :primary="true"
            @click="deleteCustomThemeName = key"
          />
          <KButton
            class="delete-edit-button"
            :aria-label="generateCustomThemeEditAriaLabel(key)"
            :text="$tr('edit')"
            :secondary="true"
            @click="editCustomThemeName = key, editCustomTheme = value"
          />

        </KFixedGridItem>

        <!-- Button to add a new custom theme -->
        <KFixedGridItem
          v-if="Object.keys(customThemes).length < 8"
          span="1"
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="$tr('addNewTheme')"
            @click="addCustomTheme = 'myTheme' + ((Object.keys(customThemes).length + 1))"
          >
            <KIcon
              icon="plus"
              style="top: 0; width: 24px; height: 24px;"
            />
          </KButton>

        </KFixedGridItem>
      </KFixedGrid>

      <!-- Modal to confirm deletion of a custom theme -->
      <DeleteCustomThemeModal
        v-if="deleteCustomThemeName"
        :themeName="deleteCustomThemeName"
        @submit="deleteTheme(deleteCustomThemeName)"
        @cancel="deleteCustomThemeName = null"
      />

      <!-- Modal to configure a custom theme -->
      <AddEditCustomThemeModal
        v-if="addCustomTheme || editCustomThemeName"
        :modalMode="addCustomTheme ? 'add' : 'edit'"
        :theme="addCustomTheme ? theme : editCustomTheme"
        :themeName="addCustomTheme ? addCustomTheme : editCustomThemeName"
        @submit="addNewTheme($event)"
        @cancel="addCustomTheme = null, editCustomThemeName = null, editCustomTheme = null"
      />
    </div>
  </SideBar>

</template>


<script>

  import Lockr from 'lockr';
  import { THEMES } from './EpubConstants';
  import SideBar from './SideBar';
  import DeleteCustomThemeModal from './DeleteCustomThemeModal.vue';
  import AddEditCustomThemeModal from './AddEditCustomThemeModal.vue';

  export default {
    name: 'SettingsSideBar',
    components: {
      SideBar,
      DeleteCustomThemeModal,
      AddEditCustomThemeModal,
    },
    props: {
      theme: {
        type: Object,
        required: true,
      },
      decreaseFontSizeDisabled: {
        type: Boolean,
        required: false,
        default: false,
      },
      increaseFontSizeDisabled: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        customThemes: {},
        deleteCustomThemeName: null,
        editCustomThemeName: null,
        editCustomTheme: null,
        addCustomTheme: null,
      };
    },
    computed: {
      themes() {
        return THEMES;
      },
      settingsButtonFocus() {
        return {
          ':focus': {
            ...this.$coreOutline,
            outlineOffset: '0px',
            outlineWidth: '2px',
          },
        };
      },
    },
    mounted() {
      this.customThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
    },
    methods: {
      generateThemeAriaLabel(themeName) {
        switch (themeName) {
          case 'WHITE':
            return this.$tr('setWhiteTheme');
          case 'BEIGE':
            return this.$tr('setBeigeTheme');
          case 'GREY':
            return this.$tr('setGreyTheme');
          case 'BLACK':
            return this.$tr('setBlackTheme');
          default:
            return '';
        }
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
      isCurrentlySelectedTheme(theme) {
        return (
          theme.backgroundColor === this.theme.backgroundColor &&
          theme.textColor === this.theme.textColor
        );
      },
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
      addNewTheme(tempTheme) {
        const savedCustomThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
        if (this.editCustomThemeName && this.editCustomThemeName !== tempTheme.name) {
          delete savedCustomThemes[this.editCustomThemeName];
        }
        savedCustomThemes[tempTheme.name] = tempTheme;
        Lockr.set('kolibriEpubRendererCustomThemes', { ...savedCustomThemes });
        this.customThemes = savedCustomThemes;
        this.$emit('setTheme', tempTheme);
        this.addCustomTheme = null;
        this.editCustomThemeName = null;
      },
      deleteTheme(themeName) {
        const savedCustomThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
        delete savedCustomThemes[themeName];
        Lockr.set('kolibriEpubRendererCustomThemes', { ...savedCustomThemes });
        this.customThemes = savedCustomThemes;
        this.deleteCustomThemeName = null;
        if (themeName === this.theme.name) {
          this.$emit('setTheme', this.themes.WHITE); // apply the default theme
        }
      },
    },
    $trs: {
      textSize: {
        message: 'Text size',
        context:
          'Indicate the size of the text in the EPUB reader. Learner can either decrease of increase the size of the text.',
      },
      decrease: {
        message: 'Decrease',
        context: 'Button used to make the EPUB reader text size smaller.',
      },
      increase: {
        message: 'Increase',
        context: 'Button used to make the EPUB reader text size larger.',
      },
      theme: {
        message: 'Theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option.",
      },
      customTheme: {
        message: 'My themes',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'Custom Themes' option.",
      },
      addNewTheme: {
        message: 'Add new theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of user preferred colors using the 'Custom Themes' option. This button allows learners to add a new theme.",
      },
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
      setWhiteTheme: {
        message: 'Set white theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option. In this case it can be set to white.",
      },
      setBeigeTheme: {
        message: 'Set beige theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option. In this case it can be set to beige.",
      },
      setGreyTheme: {
        message: 'Set grey theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option. In this case it can be set to grey.",
      },
      setBlackTheme: {
        message: 'Set black theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option. In this case it can be set to black.",
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

  @import './EpubStyles';

  .settings-button {
    width: calc(100% - 4px);
    min-width: unset;
    padding: 8px;
    margin: 2px;
    line-height: unset;
    transition: none;
  }

  .theme-button {
    height: 64px;
    margin-top: 16px;
    border-style: solid;
    border-width: 2px;
    border-radius: 8px;
  }

  .delete-edit-button {
    width: calc(100% - 4px);
    min-width: unset;
    height: calc(100% - 4px);
    padding: 0;
    margin: 2px;
    font-size: 10px;
    line-height: unset;
    transition: none;
  }

  .o-f-h {
    overflow-x: hidden;
  }

  .truncate {
    @include truncate-text;
  }

  .epub-sidebar {
    width: 500px;
  }

</style>

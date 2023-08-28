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

      <div>
        <CustomThemeItem
          v-for="(value, key) in customThemes"
          :ref="key"
          :key="key"
          :theme="value"
          :isApplied="isCurrentlySelectedTheme(value)"
          @setCustomTheme="$emit('setTheme', value)"
          @deleteCustomTheme="deleteCustomThemeName = key"
          @editCustomTheme="editCustomThemeName = key, editCustomTheme = value"
        />

        <!-- Button to add a new custom theme -->
        <KFixedGrid numCols="3" gutter="16">
          <KFixedGridItem
            v-if="Object.keys(customThemes).length < 8"
            span="3"
          >
            <KButton
              ref="addCustomThemeButton"
              class="settings-button theme-button"
              :aria-label="$tr('addNewTheme')"
              :text="$tr('addNewTheme')"
              :icon="'plus'"
              @click="addCustomTheme = 'myTheme' + ((Object.keys(customThemes).length + 1))"
            />
          </KFixedGridItem>
        </KFixedGrid>
      </div>

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
        @submit="addCustomTheme ? addTheme($event) : editTheme($event)"
        @cancel="addCustomTheme ? addThemeCancel() : editThemeCancel(editCustomTheme)"
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
  import CustomThemeItem from './CustomThemeItem.vue';

  export default {
    name: 'SettingsSideBar',
    components: {
      SideBar,
      DeleteCustomThemeModal,
      AddEditCustomThemeModal,
      CustomThemeItem,
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
          case 'YELLOW':
            return this.$tr('setYellowTheme');
          case 'BLUE':
            return this.$tr('setBlueTheme');
          default:
            return '';
        }
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
      addTheme(tempTheme) {
        const savedCustomThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
        savedCustomThemes[tempTheme.name] = tempTheme;
        Lockr.set('kolibriEpubRendererCustomThemes', { ...savedCustomThemes });
        this.customThemes = savedCustomThemes;
        this.$emit('setTheme', tempTheme);
        this.$nextTick(() => {
          this.$refs[tempTheme.name][0].$refs.colorButton.$refs.button.focus();
        });
        this.addCustomTheme = null;
      },
      editTheme(tempTheme) {
        const savedCustomThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
        if (this.editCustomThemeName && this.editCustomThemeName !== tempTheme.name) {
          delete savedCustomThemes[this.editCustomThemeName];
        }
        savedCustomThemes[tempTheme.name] = tempTheme;
        Lockr.set('kolibriEpubRendererCustomThemes', { ...savedCustomThemes });
        this.customThemes = savedCustomThemes;
        this.$emit('setTheme', tempTheme);
        this.$nextTick(() => {
          this.$refs[tempTheme.name][0].$refs.editButton.$refs.button.focus();
        });
        this.editCustomThemeName = null;
        this.editCustomTheme = null;
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
        this.$nextTick(() => {
          this.$refs.addCustomThemeButton.$refs.button.focus();
        });
      },
      addThemeCancel() {
        this.addCustomTheme = null;
        this.$nextTick(() => {
          this.$refs.addCustomThemeButton.$refs.button.focus();
        });
      },
      editThemeCancel(tempTheme) {
        this.editCustomThemeName = null;
        this.editCustomTheme = null;
        this.$nextTick(() => {
          this.$refs[tempTheme.name][0].$refs.editButton.$refs.button.focus();
        });
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
      setYellowTheme: {
        message: 'Set yellow theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option. In this case it can be set to yellow.",
      },
      setBlueTheme: {
        message: 'Set blue theme',
        context:
          "The EPUB reader allows learners to set the background of the reader to different shades of colors using the 'Theme' option. In this case it can be set to blue.",
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

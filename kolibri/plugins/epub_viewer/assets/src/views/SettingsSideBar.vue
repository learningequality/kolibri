<template>

  <SideBar>
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
      <KFixedGrid numCols="4" gutter="8">
        <KFixedGridItem
          v-for="(value, key) in themes"
          :key="key"
          span="1"
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="generateThemeAriaLabel(key)"
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
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="generateThemeAriaLabel(key)"
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
            class="delete-button"
            :text="$tr('delete')"
            :primary="true"
            @click="deleteCustomThemeName = key"
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
            @click="addNewTheme"
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
    </div>
  </SideBar>

</template>


<script>

  import Lockr from 'lockr';
  import { THEMES } from './EpubConstants';
  import SideBar from './SideBar';
  import DeleteCustomThemeModal from './DeleteCustomThemeModal.vue';

  export default {
    name: 'SettingsSideBar',
    components: {
      SideBar,
      DeleteCustomThemeModal,
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
          ':hover': {
            backgroundColor: theme.hoverColor,
          },
        };
      },
      addNewTheme(){
        // TODO: Add new theme logic
        console.log("add new theme");

        // generate a random new theme
        const randomTheme = {
          name: 'theme' + Math.floor(Math.random() * 100),
          backgroundColor: '#'+(Math.random()*0xFFFFFF<<0).toString(16),
          textColor: '#'+(Math.random()*0xFFFFFF<<0).toString(16),
          hoverColor: '#'+(Math.random()*0xFFFFFF<<0).toString(16)
        };

        const savedCustomThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
        savedCustomThemes[randomTheme.name] = randomTheme;
        Lockr.set('kolibriEpubRendererCustomThemes', {...savedCustomThemes});
        this.customThemes = savedCustomThemes;
      },
      deleteTheme (themeName) {
        const savedCustomThemes = Lockr.get('kolibriEpubRendererCustomThemes') || {};
        delete savedCustomThemes[themeName];
        Lockr.set('kolibriEpubRendererCustomThemes', {...savedCustomThemes});
        this.customThemes = savedCustomThemes;
        this.deleteCustomThemeName = null;
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
        message: 'Custom Themes',
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
    height: 44.5px;
    border-style: solid;
    border-width: 2px;
  }

  .delete-button {
    width: calc(100% - 4px);
    min-width: unset;
    height: calc(100% - 4px);
    margin: 2px;
    line-height: unset;
    transition: none;
    font-size: 10px;
    padding: 0px;
  }

  .o-f-h {
    overflow-x: hidden;
  }

  .truncate {
    @include truncate-text;
  }

</style>

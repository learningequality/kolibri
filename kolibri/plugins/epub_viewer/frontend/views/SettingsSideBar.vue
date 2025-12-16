<template>

  <SideBar>
    <div class="o-f-h">
      <h3>{{ $tr('textSize') }}</h3>
      <KFixedGrid
        numCols="2"
        gutter="8"
      >
        <KFixedGridItem span="1">
          <KButton
            ref="decreaseFontSizeButton"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            :disabled="decreaseFontSizeDisabled"
            @click="$emit('decreaseFontSize')"
          >
            <template #icon>
              <KIcon
                icon="minus"
                style="top: 0; width: 24px; height: 24px"
              />
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
              <KIcon
                icon="plus"
                style="top: 0; width: 24px; height: 24px"
              />
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
      <KFixedGrid
        numCols="4"
        gutter="8"
      >
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
              v-if="isCurrentlySelectedTheme(value)"
              icon="check"
              :style="{ fill: value.textColor }"
              style="top: 0; width: 24px; height: 24px"
            />
          </KButton>
        </KFixedGridItem>
      </KFixedGrid>
    </div>
  </SideBar>

</template>


<script>

  import { THEMES } from './EpubConstants';
  import SideBar from './SideBar';

  export default {
    name: 'SettingsSideBar',
    components: {
      SideBar,
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

  .o-f-h {
    overflow-x: hidden;
  }

  .truncate {
    @include truncate-text;
  }

</style>

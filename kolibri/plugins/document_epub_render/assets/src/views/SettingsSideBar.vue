<template>

  <SideBar>
    <div class="o-f-h">
      <h3>{{ $tr('textSize') }}</h3>
      <KGrid cols="12" gutter="8">
        <KGridItem span="6">
          <KButton
            ref="decreaseFontSizeButton"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            :disabled="decreaseFontSizeDisabled"
            @click="$emit('decreaseFontSize')"
          >
            <mat-svg
              name="remove"
              category="content"
            />
            <div class="truncate">
              {{ $tr('decrease') }}
            </div>
          </KButton>
        </KGridItem>
        <KGridItem span="6">
          <KButton
            ref="increaseFontSizeButton"
            :disabled="increaseFontSizeDisabled"
            :class="['settings-button', $computedClass(settingsButtonFocus)]"
            @click="$emit('increaseFontSize')"
          >
            <mat-svg
              name="add"
              category="content"
            />
            <div class="truncate">
              {{ $tr('increase') }}
            </div>
          </KButton>
        </KGridItem>
      </KGrid>
    </div>

    <div class="o-f-h">
      <h3>{{ $tr('theme') }}</h3>
      <KGrid cols="12" gutter="8">
        <KGridItem
          v-for="(value, key) in themes"
          :key="key"
          span="3"
        >
          <KButton
            class="settings-button theme-button"
            :aria-label="generateThemeAriaLabel(key)"
            :appearanceOverrides="generateStyle(value)"
            @click="$emit('setTheme', value)"
          >
            <mat-svg
              v-if="isCurrentlySelectedTheme(value) "
              name="check"
              category="navigation"
              :style="{ fill: value.textColor }"
            />
          </KButton>

        </KGridItem>
      </KGrid>
    </div>
  </SideBar>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { THEMES } from './EpubConstants';
  import SideBar from './SideBar';

  export default {
    name: 'SettingsSideBar',
    components: {
      SideBar,
      KGrid,
      KGridItem,
      KButton,
    },
    mixins: [themeMixin],
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
      textSize: 'Text size',
      decrease: 'Decrease',
      increase: 'Increase',
      theme: 'Theme',
      setWhiteTheme: 'Set white theme',
      setBeigeTheme: 'Set beige theme',
      setGreyTheme: 'Set grey theme',
      setBlackTheme: 'Set black theme',
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

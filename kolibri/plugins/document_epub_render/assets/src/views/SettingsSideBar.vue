<template>

  <SideBar>
    <div class="o-f-h">
      <h3>{{ $tr('textSize') }}</h3>
      <KGrid
        :cols="12"
        :gutter="8"
      >
        <KGridItem
          size="6"
          :percentage="false"
        >
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
        <KGridItem
          size="6"
          :percentage="false"
        >
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
      <KGrid
        :cols="12"
        :gutter="8"
      >
        <KGridItem
          v-for="(value, key) in themes"
          :key="key"
          :size="3"
          :percentage="false"
        >
          <KButton
            :class="[
              'settings-button',
              'theme-button',
              $computedClass(generateStyle(value.backgroundColor))
            ]"
            :aria-label="generateThemeAriaLabel(key)"
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
  import isEqual from 'lodash/isEqual';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { darken } from 'kolibri.utils.colour';
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
        validator(val) {
          return Object.values(THEMES).some(obj => isEqual(obj, val));
        },
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
      generateStyle(backgroundColor) {
        return {
          ...this.settingsButtonFocus,
          backgroundColor,
          ':hover': {
            backgroundColor: darken(backgroundColor, '10%'),
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

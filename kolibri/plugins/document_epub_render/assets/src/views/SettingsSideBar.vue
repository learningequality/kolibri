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
            class="settings-button"
            :disabled="decreaseFontSizeDisabled"
            @click="$emit('decreaseFontSize')"
          >
            <mat-svg
              name="remove"
              category="content"
            />
            <div class="truncate">{{ $tr('decrease') }}</div>
          </KButton>
        </KGridItem>
        <KGridItem
          size="6"
          :percentage="false"
        >
          <KButton
            ref="increaseFontSizeButton"
            :disabled="increaseFontSizeDisabled"
            @click="$emit('increaseFontSize')"
            class="settings-button"
          >
            <mat-svg
              name="add"
              category="content"
            />
            <div class="truncate">{{ $tr('increase') }}</div>
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
          :size="12 / Object.keys(themes).length"
          :percentage="false"
        >
          <KButton
            class="settings-button theme-button"
            :style="{ backgroundColor: value.backgroundColor }"
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

    <div class="o-f-h">
      <h3>{{ $tr('textAlignment') }}</h3>
      <KGrid
        :cols="12"
        :gutter="8"
      >
        <KGridItem
          size="50"
          :percentage="true"
        >
          <KButton
            ref="leftAlignmentButton"
            class="settings-button alignment-button"
            :class="{'alignment-button-selected': textAlignments.LEFT === textAlignment}"
            @click="$emit('setTextAlignment', textAlignments.LEFT)"
          >
            <mat-svg
              name="format_align_left"
              category="editor"
            />
            <div class="truncate">{{ $tr('alignmentLeft') }}</div>
          </KButton>
        </KGridItem>
        <KGridItem
          size="50"
          :percentage="true"
        >
          <KButton
            ref="justifiedAlignmentButton"
            class="settings-button alignment-button"
            :class="{'alignment-button-selected': textAlignments.JUSTIFY === textAlignment}"
            @click="$emit('setTextAlignment', textAlignments.JUSTIFY)"
          >
            <mat-svg
              name="format_align_justify"
              category="editor"
            />
            <div class="truncate">{{ $tr('alignmentJustified') }}</div>
          </KButton>
        </KGridItem>
      </KGrid>
    </div>
  </SideBar>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import isEqual from 'lodash/isEqual';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { TEXT_ALIGNMENTS, THEMES } from './EpubConstants';
  import SideBar from './SideBar';

  export default {
    name: 'SettingsSideBar',
    $trs: {
      textSize: 'Text size',
      decrease: 'Decrease',
      increase: 'Increase',
      theme: 'Theme',
      textAlignment: 'Text alignment',
      alignmentLeft: 'Left',
      alignmentJustified: 'Justified',
      setWhiteTheme: 'Set white theme',
      setBeigeTheme: 'Set beige theme',
      setGreyTheme: 'Set grey theme',
      setBlackTheme: 'Set black theme',
    },
    components: {
      SideBar,
      KGrid,
      KGridItem,
      KButton,
    },
    props: {
      theme: {
        type: Object,
        required: true,
        validator(val) {
          return Object.values(THEMES).some(obj => isEqual(obj, val));
        },
      },
      textAlignment: {
        type: String,
        required: true,
        validator(val) {
          return Object.values(TEXT_ALIGNMENTS).includes(val);
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
      textAlignments() {
        return TEXT_ALIGNMENTS;
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  @import './EpubStyles';

  .settings-button.button.secondary.raised {
    width: calc(100% - 4px);
    min-width: unset;
    padding: 8px;
    margin: 2px;
    line-height: unset;
    transition: none;
    &:focus {
      outline: $core-outline;
    }
  }

  .theme-button {
    height: 44.5px;
  }

  .theme-button,
  .alignment-button {
    border-style: solid;
    border-width: 2px;
  }

  .alignment-button-selected {
    border-bottom-color: $core-action-normal;
    border-bottom-width: 3px;
  }

  .o-f-h {
    overflow-x: hidden;
  }

  .truncate {
    @include truncate-text;
  }

</style>

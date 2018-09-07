<template>

  <SideBar>
    <div class="o-f-h">
      <h3>{{ $tr('textSize') }}</h3>
      <KGrid :gutter="16">
        <KGridItem
          size="50"
          :percentage="true"
        >
          <KButton
            ref="decreaseFontSizeButton"
            class="settings-button"
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
          size="50"
          :percentage="true"
        >
          <KButton
            ref="increaseFontSizeButton"
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
      <h3>{{ $tr('background') }}</h3>
      <KGrid
        :cols="12"
        :gutter="2 * Math.round((64 / Object.keys(themes).length) / 2)"
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
            :class="{ 'theme-button-selected': isCurrentlySelectedTheme(value) }"
            :aria-label="$tr('setTheme', {themeName: key })"
            @click="$emit('setTheme', value)"
          />

        </KGridItem>
      </KGrid>
    </div>

    <div class="o-f-h">
      <h3>{{ $tr('layout') }}</h3>
      <KGrid :gutter="16">
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
      background: 'Background',
      layout: 'Layout',
      alignmentLeft: 'Left',
      alignmentJustified: 'Justified',
      setTheme: 'Set { themeName } theme',
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
    box-shadow: none;
    transition: none;
    &:focus {
      outline: $core-outline;
    }
  }

  .theme-button {
    height: 36.5px;
  }

  .theme-button,
  .alignment-button {
    border-style: solid;
    border-width: 2px;
  }

  .theme-button-selected,
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

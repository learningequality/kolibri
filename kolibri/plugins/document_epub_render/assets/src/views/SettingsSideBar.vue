<template>

  <SideBar>
    <div class="o-f-h">
      <h3>{{ $tr('textSize') }}</h3>
      <KGrid>
        <KGridItem
          v-for="(sizeAdjustment, index) in [$tr('decrease'), $tr('increase')]"
          :key="index"
          size="50"
          :percentage="true"
        >
          <button @click="$emit('')">
            <mat-svg
              v-if="sizeAdjustment === $tr('decrease')"
              name="remove"
              category="content"
            />
            <mat-svg
              v-else-if="sizeAdjustment === $tr('increase')"
              name="add"
              category="content"
            />
            <div>{{ sizeAdjustment }}</div>
          </button>
        </KGridItem>
      </KGrid>
    </div>

    <div class="o-f-h">
      <h3>{{ $tr('background') }}</h3>
      <KGrid>
        <KGridItem
          v-for="(value, key) in themes"
          :key="key"
          size="25"
          :percentage="true"
        >
          <button
            class="theme-button"
            :style="{ backgroundColor: value.backgroundColor }"
            :class="{ 'theme-button-selected': isCurrentlySelectedTheme(value) }"
            @click="$emit('setTheme', value)"
          >
          </button>

        </KGridItem>
      </KGrid>
    </div>

    <div class="o-f-h">
      <h3>{{ $tr('layout') }}</h3>
      <KGrid>
        <KGridItem
          v-for="(alignment, index) in textAlignments"
          :key="index"
          size="50"
          :percentage="true"
        >
          <button
            class="alignment-button"
            :class="{'alignment-button-selected': alignment === textAlignment}"
            @click="$emit('setTextAlignment', alignment)"
          >
            <template v-if="alignment === textAlignments.LEFT">
              <mat-svg
                name="format_align_left"
                category="editor"
              />
              <div>{{ $tr('leftAligned') }}</div>
            </template>

            <template v-else-if="alignment === textAlignments.JUSTIFY">
              <mat-svg
                name="format_align_justify"
                category="editor"
              />
              <div>{{ $tr('justified') }}</div>
            </template>
          </button>
        </KGridItem>
      </KGrid>
    </div>
  </SideBar>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import isEqual from 'lodash/isEqual';
  import { TEXT_ALIGNMENTS, THEMES } from './EPUB_RENDERER_CONSTANTS';
  import SideBar from './SideBar';

  export default {
    name: 'SettingsSideBar',
    $trs: {
      textSize: 'Text size',
      decrease: 'Decrease',
      increase: 'Increase',
      background: 'Background',
      layout: 'Layout',
      leftAligned: 'Left aligned',
      justified: 'Justified',
    },
    components: {
      SideBar,
      KGrid,
      KGridItem,
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

  @import './epub';

  .toc-list {
    @include toc-list;
  }

  button {
    width: 100%;
    padding: 8px;
    background-color: $core-grey-200;
    border-radius: $radius;
  }

  .o-f-h {
    overflow-x: hidden;
  }

  .theme-button {
    height: 36.5px;
    border-style: solid;
    border-width: 2px;
  }

  .theme-button-selected {
    border-bottom-color: #ff00b7;
    border-bottom-width: 3px;
  }

  .alignment-button {
    border-style: solid;
    border-width: 2px;
  }
  .alignment-button-selected {
    border-color: #ff00b7;
    border-style: solid;
    border-bottom-width: 2px;
  }

</style>

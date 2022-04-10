<template>

  <div class="results-header-group">
    <div
      v-for="item in items"
      :key="item.key + item.value"
      class="filter-chip"
      :style="{ backgroundColor: $themePalette.grey.v_300 }"
    >
      <span>
        <p class="filter-chip-text">{{ item.text }}</p>
        <KIconButton
          icon="delete"
          size="mini"
          class="filter-chip-button"
          @click="$emit('removeItem', item)"
        />
      </span>
    </div>
    <KButton
      :text="clearAllString()"
      appearance="basic-link"
      class="filter-action-button"
      @click="$emit('clearSearch')"
    />
  </div>

</template>


<script>

  import flatMap from 'lodash/flatMap';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { AllCategories } from 'kolibri.coreVue.vuex.constants';
  import useChannels from '../composables/useChannels';
  import useLanguages from '../composables/useLanguages';
  import EmbeddedSidePanel from './EmbeddedSidePanel';

  export default {
    name: 'SearchChips',
    mixins: [commonCoreStrings],
    setup() {
      const { languagesMap } = useLanguages();
      const { channelsMap } = useChannels();
      return { channelsMap, languagesMap };
    },
    props: {
      searchTerms: {
        type: Object,
        default: () => ({}),
      },
    },
    computed: {
      items() {
        return flatMap(this.searchTerms, (value, key) => {
          if (key === 'keywords' && value && value.length) {
            return [
              {
                text: value,
                key,
                value,
              },
            ];
          }
          return Object.keys(value).map(val => {
            return {
              value: val,
              key,
              text: this.translate(key, val),
            };
          });
        });
      },
    },
    created() {
      const LibraryPageComponent = require('./LibraryPage').default;
      this.translator = crossComponentTranslator(LibraryPageComponent);
      this.allCategoriesTranslator = crossComponentTranslator(EmbeddedSidePanel);
    },
    methods: {
      clearAllString() {
        return this.translator.$tr('clearAll'); // eslint-disable-line kolibri/vue-no-undefined-string-uses
      },
      translate(key, value) {
        if (key === 'languages') {
          return this.languagesMap[value].lang_name;
        }
        if (key === 'channels') {
          return this.channelsMap[value].name;
        }
        if (key === 'categories' && value === AllCategories) {
          return this.allCategoriesTranslator.$tr('allCategories'); // eslint-disable-line kolibri/vue-no-undefined-string-uses
        }
        return this.coreString(value);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .results-header-group {
    display: inline-block;
    margin-bottom: 24px;
  }

  .filter-action-button {
    display: inline-block;
    margin: 4px;
    margin-left: 8px;
  }

  .filter-chip {
    display: inline-block;
    margin-left: 8px;
    font-size: 14px;
    vertical-align: top;
    border-radius: 34px;
  }

  .filter-chip-text {
    display: inline-block;
    margin: 4px 0 4px 8px;
    font-size: 14px;
  }

  .filter-chip-button {
    min-width: 24px !important;
    margin: 2px;
    vertical-align: middle;
  }

</style>

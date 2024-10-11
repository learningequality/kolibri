<template>

  <div class="results-header-group">
    <div
      v-for="item in items"
      :key="item.key + item.value"
      class="filter-chip"
      :style="{ backgroundColor: $themePalette.grey.v_200 }"
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
      :text="coreString('clearAllAction')"
      appearance="basic-link"
      class="filter-action-button"
      @click="$emit('clearSearch')"
    />
  </div>

</template>


<script>

  import flatMap from 'lodash/flatMap';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { NoCategories } from 'kolibri/constants';
  import useChannels from 'kolibri-common/composables/useChannels';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';

  export default {
    name: 'SearchChips',
    mixins: [commonCoreStrings],
    setup() {
      const { availableLanguages } = injectBaseSearch();
      const languagesMap = availableLanguages.value.reduce((map, lang) => {
        map[lang.id] = lang;
        return map;
      }, {});
      const { channelsMap } = useChannels();
      return {
        channelsMap,
        languagesMap,
      };
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
    methods: {
      translate(key, value) {
        if (key === 'languages') {
          return this.languagesMap[value].lang_name;
        }
        if (key === 'channels') {
          return this.channelsMap[value].name;
        }
        if (key === 'categories' && value === NoCategories) {
          return this.coreString('uncategorized');
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

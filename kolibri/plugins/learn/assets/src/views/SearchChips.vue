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
  import { createTranslator } from 'kolibri.utils.i18n';
  import { AllCategories } from 'kolibri.coreVue.vuex.constants';
  import useChannels from '../composables/useChannels';
  import useLanguages from '../composables/useLanguages';

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
      this.translator = createTranslator('LibraryPage', {
        recent: {
          message: 'Recent',
          context:
            'Header for the section in the Library tab with resources that the learner recently engaged with.',
        },
        /* eslint-disable kolibri/vue-no-unused-translations */
        results: {
          message: '{results, number, integer} {results, plural, one {result} other {results}}',
          context: 'Number of results for a given term after a Library search.',
        },
        moreThanXResults: {
          message: 'More than {results} results',
          context: 'Number of results for a given term after a Library search.',
        },
        /* eslint-disable kolibri/vue-no-unused-translations */
        viewAsList: {
          message: 'View as list',
          context: 'Label for a button used to view resources as a list.',
        },
        viewAsGrid: {
          message: 'View as grid',
          context: 'Label for a button used to view resources as a grid.',
        },
        clearAll: {
          message: 'Clear all',
          context: 'Clickable link which removes all currently applied search filters.',
        },
      });
      this.allCategoriesTranslator = createTranslator('EmbeddedSidePanel', {
        keywords: {
          message: 'Keywords',
          context: 'Section header label in the Library page sidebar.',
        },
        categories: {
          message: 'Categories',
          context: 'Section header label in the Library page sidebar.',
        },
      });
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

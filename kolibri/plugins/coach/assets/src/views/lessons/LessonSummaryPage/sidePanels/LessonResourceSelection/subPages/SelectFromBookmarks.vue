<template>

  <div>
    <UpdatedResourceSelection
      canSelectAll
      :contentList="contentList"
      :viewMoreButtonState="viewMoreButtonState"
      :fetchMore="fetchMore"
      :selectionRules="selectionRules"
      :selectedResources="selectedResources"
      @selectResources="$emit('selectResources', $event)"
      @deselectResources="$emit('deselectResources', $event)"
    />
  </div>

</template>


<script>

  import { getCurrentInstance } from 'vue';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';
  import { PageNames } from '../../../../../../constants';

  /**
   * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectFromBookmarks',
    components: {
      UpdatedResourceSelection,
    },
    setup(props) {
      const { selectFromBookmarks$ } = coreStrings;
      const instance = getCurrentInstance();

      props.setTitle(selectFromBookmarks$());
      props.setGoBack(() => {
        instance.proxy.$router.push({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        });
      });

      const { data, moreState, fetchMore } = props.bookmarksFetch;

      return {
        contentList: data,
        viewMoreButtonState: moreState,
        fetchMore,
      };
    },
    props: {
      setTitle: {
        type: Function,
        default: () => {},
      },
      setGoBack: {
        type: Function,
        default: () => {},
      },
      /**
       * Fetch object for fetching bookmarks.
       * @type {FetchObject}
       */
      bookmarksFetch: {
        type: Object,
        required: true,
      },
      selectionRules: {
        type: Array,
        required: false,
        default: () => [],
      },
      selectedResources: {
        type: Array,
        required: true,
      },
    },
    methods: {
      /**
       * @public
       */
      goBack() {
        this.$router.push({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        });
      },
    },
  };

</script>

<template>

  <div>
    <UpdatedResourceSelection
      canSelectAll
      :source="ResourceContentSource.BOOKMARKS"
    />
  </div>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';
  import { ResourceContentSource } from '../constants';
  import { PageNames } from '../../../../../../constants';

  export default {
    name: 'SelectFromBookmarks',
    components: {
      UpdatedResourceSelection,
    },
    setup(props, { root }) {
      const { selectFromBookmarks$ } = coreStrings;

      props.setTitle(selectFromBookmarks$());
      props.setGoBack(() => {
        root.$router.push({
          name: PageNames.LESSON_SELECT_RESOURCES_INDEX,
        });
      });
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
    },
    data() {
      return {
        ResourceContentSource,
      };
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

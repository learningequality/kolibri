<template>

  <div>
    <KModal
      v-if="!isLevel0 "
      :title="$tr('title')"
      :cancelText="coreString('closeAction')"
      size="large"
      @cancel="$emit('cancel')"
    />
    <Fullscreen v-else>
      {{ $tr('title') }}
    </Fullscreen>
  </div>

</template>


<script>

  // import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  // import { LibraryCategories } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'CategorySearchModal',
    mixins: [commonCoreStrings, responsiveWindowMixin],
    // props: {
    //   selectedCategory: {
    //     type: String,
    //     required: true,
    //     default: null,
    //   },
    // },
    computed: {
      // categoryGroupIsNested() {
      //   return Object.values(this.displaySelectedCategories).some(
      //     obj => Object.keys(obj.nested).length
      //   );
      // },
      // displaySelectedCategories() {
      //   return LibraryCategories[this.selectedCategory].nested;
      // },
      isLevel0() {
        return this.windowWidth <= 330;
      },
      // responsiveSpan() {
      //   if (this.windowWidth < 480) {
      //     return 8;
      //   } else if (this.windowWidth < 600) {
      //     return 6;
      //   } else {
      //     return 4;
      //   }
      // },
    },
    // methods: {
    //   camelCase(val) {
    //     return camelCase(val);
    //   },
    // },
    $trs: {
      title: {
        message: 'Choose a category',
        context: 'Title of the category selection window',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .level-0 {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 35;
    overflow-y: scroll;
  }

</style>

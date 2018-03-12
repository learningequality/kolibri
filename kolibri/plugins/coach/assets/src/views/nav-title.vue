<template>

  <h1>
    <span class="caret-after">
      <k-router-link
        :text="$tr('allClasses')"
        :to="classListPage"
      />
    </span>
    <span v-if="username">
      <span class="caret-after">
        <k-router-link :text="className" :to="classRootPage" />
      </span>
      <span>{{ username }}</span>
    </span>
    <span v-else>{{ className }}</span>
  </h1>

</template>


<script>

  import { PageNames } from '../constants';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  export default {
    name: 'classSelector',
    $trs: {
      allClasses: 'All classes',
    },
    components: {
      kRouterLink,
    },
    props: {
      className: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      linkClass: {
        type: Boolean,
        default: true,
      },
      username: {
        type: String,
        default: null,
      },
    },
    computed: {
      classListPage() {
        return { name: PageNames.CLASS_LIST };
      },
      classRootPage() {
        return { name: PageNames.CLASS_ROOT, classId: this.classId };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .caret-after
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px
      vertical-align: top

</style>

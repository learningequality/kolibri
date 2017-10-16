<template>

  <div>
    <h1 class="classes-link">
      <k-router-link :text="$tr('allClasses')" :to="classListPage"/>
    </h1>
    <ui-select
      :name="$tr('selectClass')"
      :value="currentClass"
      :options="classOptions"
      @change="changeClass"
      class="class-selector"
    />
  </div>

</template>


<script>

  import orderBy from 'lodash/orderBy';
  import { PageNames } from '../../constants';
  import uiSelect from 'keen-ui/src/UiSelect';
  import uiIcon from 'keen-ui/src/UiIcon';

  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  export default {
    name: 'classSelector',
    $trs: {
      allClasses: 'All classes',
      selectClass: 'Class',
    },
    components: {
      uiSelect,
      uiIcon,
      kRouterLink,
    },
    props: {
      classes: {
        type: Array,
        required: true,
      },
      currentClassId: {
        type: String,
        required: true,
      },
    },
    computed: {
      sortedClasses() {
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
      classOptions() {
        return this.sortedClasses.map(classroom => ({
          label: classroom.name,
          id: classroom.id,
        }));
      },
      currentClass() {
        return this.classOptions.find(classroom => classroom.id === this.currentClassId);
      },
      classListPage() {
        return { name: PageNames.CLASS_LIST };
      },
    },
    methods: {
      changeClass(classSelected) {
        this.$emit('changeClass', classSelected.id);
      },
    },
  };

</script>


<style lang="stylus">

  .class-selector
    .ui-select__display-value
      font-size: 1.5em
      font-weight: bold

</style>


<style lang="stylus" scoped>

  .class-selector
    display: inline-flex
    vertical-align: bottom

  .classes-link
    display: inline-block
    &:after
      content: '\203A'
      margin-right: 8px
      margin-left: 8px
      vertical-align: top

  a
    display: inline-block
    vertical-align: bottom
    margin-bottom: 2px

</style>

<template>

  <div>

    <div 
      class="header">
        <h1>{{ $tr('allClasses') }}</h1>

      <k-button
        class="create-btn"
        :class="{ 'create-btn-mobile': windowSize.breakpoint <= 0}"
        @click="openCreateClassModal"
        :text="$tr('addNew')"
        :primary="true"
      />
    </div>

    <class-delete-modal
      v-if="showDeleteClassModal"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
    />
    <class-create-modal v-if="showCreateClassModal" :classes="sortedClasses" />

    <div class="table-wrapper" v-if="!noClassesExist">
      <table class="roster">
        <caption class="visuallyhidden">{{ $tr('classes') }}</caption>
        <thead class="table-header">
          <tr>
            <th scope="col" class="table-text">{{ $tr('className') }}</th>
            <th scope="col" class="table-data">{{ $tr('members') }}</th>
            <th scope="col">{{ $tr('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="classModel in sortedClasses" :key="classModel.id">
            <th scope="row" class="table-text">
              <k-router-link
                :text="classModel.name"
                :to="classEditLink(classModel.id)"
                class="table-name"
              />
            </th>
            <td class="table-data">
              {{ classModel.memberCount }}
            </td>
            <td class="table-btn">
              <k-button appearance="flat-button" @click="openDeleteClassModal(classModel)" :text="$tr('deleteClass')" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else>{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  import * as constants from '../../constants';
  import * as actions from '../../state/actions';
  import orderBy from 'lodash/orderBy';
  import classCreateModal from './class-create-modal';
  import classDeleteModal from './class-delete-modal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'classPage',
    components: {
      classCreateModal,
      classDeleteModal,
      kButton,
      kRouterLink,
    },
    mixins: [responsiveWindow],
    data: () => ({ currentClassDelete: null }),
    computed: {
      sortedClasses() {
        return orderBy(this.classes, [classroom => classroom.name.toUpperCase()], ['asc']);
      },
      showDeleteClassModal() {
        return this.modalShown === constants.Modals.DELETE_CLASS;
      },
      showCreateClassModal() {
        return this.modalShown === constants.Modals.CREATE_CLASS;
      },
      noClassesExist() {
        return this.sortedClasses.length === 0;
      },
    },
    methods: {
      classEditLink(id) {
        return {
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          params: { id },
        };
      },
      openDeleteClassModal(classModel) {
        this.currentClassDelete = classModel;
        this.displayModal(constants.Modals.DELETE_CLASS);
      },
      openCreateClassModal() {
        this.displayModal(constants.Modals.CREATE_CLASS);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
        classes: state => state.pageState.classes,
      },
      actions: { displayModal: actions.displayModal },
    },
    $trs: {
      allClasses: 'All Classes',
      addNew: 'Add New Class',
      deleteClass: 'Delete Class',
      className: 'Class Name',
      classes: 'Users',
      members: 'Members',
      actions: 'Actions',
      noClassesExist: 'No Classes Exist.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .roster
    width: 100%
    border-spacing: 8px
    border-collapse: separate

  .table-wrapper
    overflow-x: auto

  thead th
    color: $core-text-annotation
    font-size: smaller
    font-weight: normal

  .table-text
    text-align: left
    width: 100%

  .table-data
    text-align: center

  .table-btn
    text-align: right

  .header
    position: relative
    padding-right: 150px
    margin-bottom: 16px

  .create-btn
    position: absolute
    display: block
    top: 0
    right: 0
  
  .create-btn-mobile
    position: relative
    display: inline-block
    right: 10px
    min-width: 150px

</style>

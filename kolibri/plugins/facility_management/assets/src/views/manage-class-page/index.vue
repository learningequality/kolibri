<template>

  <div>

    <div class="header">
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

    <core-table v-if="!noClassesExist">
      <caption class="visuallyhidden">{{ $tr('classes') }}</caption>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('className') }}</th>
          <th>{{ $tr('members') }}</th>
          <th>{{ $tr('actions') }}</th>
        </tr>
      </thead>
      <tbody slot="tbody">
        <tr
          v-for="classModel in sortedClasses"
          :key="classModel.id"
        >
          <td class="core-table-icon-col">
            <ui-icon icon="business" />
          </td>
          <th class="core-table-main-col">
            <k-router-link
              :text="classModel.name"
              :to="classEditLink(classModel.id)"
            />
          </th>
          <td>
            {{ classModel.memberCount }}
          </td>
          <td>
            <k-button
              appearance="flat-button"
              @click="openDeleteClassModal(classModel)"
              :text="$tr('deleteClass')"
            />
          </td>
        </tr>
      </tbody>
    </core-table>

    <p v-else>{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import UiIcon from 'keen-ui/src/UiIcon';
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
      CoreTable,
      classCreateModal,
      classDeleteModal,
      kButton,
      kRouterLink,
      UiIcon,
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
      allClasses: 'All classes',
      addNew: 'Add new class',
      deleteClass: 'Delete class',
      className: 'Class name',
      classes: 'Users',
      members: 'Members',
      actions: 'Actions',
      noClassesExist: 'No classes exist.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

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

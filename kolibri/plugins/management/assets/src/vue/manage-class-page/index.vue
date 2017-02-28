<template>

  <div class="class-roster">

    <div class="header">
      <h1>
        {{$tr('allClasses')}}
      </h1>
    </div>

    <div class="create">
      <icon-button
        @click="openCreateClassModal"
        class="create-class-button"
        :text="$tr('addNew')"
        :primary="true">
      </icon-button>
    </div>

    <hr>

    <!-- Modals -->
    <class-delete-modal
      v-if="deletingClass"
      :classid="currentClassDelete.id"
      :classname="currentClassDelete.name"
      @close="closeDeleteClassModal"
    />
    <class-create-modal
      v-if="creatingClass"
      @close="closeCreateUserModal"/>

    <table class="roster">

      <caption class="visuallyhidden">{{$tr('classes')}}</caption>

      <!-- Table Headers -->
      <thead v-if="!noClassesExist">
        <tr>
          <th class="col-header" scope="col"> {{$tr('className')}} </th>
          <th class="col-header hide-on-mobile" scope="col"> {{$tr('learners')}} </th>
          <th class="col-header hide-on-mobile" scope="col"> {{$tr('coaches')}} </th>
          <th class="col-header hide-on-mobile" scope="col"> {{$tr('admins')}} </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="!noClassesExist">
        <tr v-for="cl in classes">
          <!-- Class Name field -->
          <th scope="row" class="table-cell">
            <span class="table-name">
              {{cl.name}}
            </span>
          </th>

          <!-- Learners field -->
          <td class="table-cell hide-on-mobile">
            {{cl.learners}}
          </td>

          <!-- Coaches field -->
          <td class="table-cell hide-on-mobile">
            {{cl.coaches}}
          </td>

          <!-- Admins field -->
          <td class="table-cell hide-on-mobile">
            {{cl.admins}}
          </td>

          <!-- delete field -->
          <td class="table-cell">
            <icon-button
              class="delete-class-button"
              @click="openDeleteClassModal(cl)"
              :text="$tr('deleteClass')"
            />
          </td>

        </tr>
      </tbody>

    </table>

    <p v-if="noClassesExist">{{ $tr('noClassesExist') }}</p>

  </div>

</template>


<script>

  module.exports = {
    components: {
      'class-create-modal': require('./class-create-modal'),
      'class-delete-modal': require('./class-delete-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    // Has to be a funcion due to vue's treatment of data
    data: () => ({
      creatingClass: false,
      deletingClass: false,
      currentClassDelete: null,
    }),
    computed: {
      noClassesExist() {
        return this.classes.length === 0;
      },
    },
    methods: {
      openDeleteClassModal(cl) {
        this.currentClassDelete = cl;
        this.deletingClass = true;
      },
      closeDeleteClassModal() {
        this.deletingClass = false;
        this.currentClassDelete = {};
      },
      openCreateClassModal() {
        this.creatingClass = true;
      },
      closeCreateUserModal() {
        this.creatingClass = false;
      },
    },
    vuex: {
      getters: {
        classes: state => state.pageState.classes,
      },
    },
    $trNameSpace: 'classPage',
    $trs: {
      allClasses: 'All Classes in',
      // button text
      addNew: 'Add New Class',
      deleteClass: 'Delete Class',
      // table info
      className: 'Class Name',
      classes: 'Users',
      learners: 'Learners',
      coaches: 'Coaches',
      admins: 'Admins',
      noClassesExist: 'No Classes Exist.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em

  .create
    float: right

  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both

  .header h1
    display: inline-block

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  .roster
    width: 100%
    word-break: break-all

  th
    text-align: inherit

  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
    width: 30%

  .table-cell
    font-weight: normal // compensates for <th> cells
    padding-bottom: $row-padding
    color: $core-text-default

  .delete-class-button
    border: none

  .create-class-button
    width: 100%

  .table-name
    $line-height = 1em
    line-height: $line-height
    max-height: ($line-height * 2)
    display: inline-block
    padding-right: 1em

  .role-header
    display: none

  @media print
    .class-roster
      width: 500px

  // TODO temporary fix until remove width calculation from learn
  @media screen and (max-width: 840px)
    .create
      box-sizing: border-box
      width: 49%
    .create
      margin-top: -78px
    .hide-on-mobile
      display: none
    .table-name
      overflow: hidden
      text-overflow: ellipsis
      white-space: nowrap
      width: 100px
    .col-header
      width: 50%

</style>

<template>

  <core-modal :title="$tr('confirmEnrollment')" @cancel="close" class="confirm-modal">
    <div>
      <p>{{ $tr('areYouSure') }} <strong>{{ className }}</strong>?</p>
      <ul>
        <li v-for="userId in selectedUsers"><strong>{{ getUsername(userId) }}</strong></li>
      </ul>
      <div>
        <icon-button
          :text="$tr('noGoBack')"
          class="undo-btn"
          @click="close"/>
        <icon-button
          :text="$tr('yesEnrollUsers')"
          class="confirm-btn"
          :primary="true"
          @click="enrollUsers"/>
      </div>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');
  const constants = require('../../state/constants');

  module.exports = {
    $trNameSpace: 'confirm-enrollment-modal',
    $trs: {
      confirmEnrollment: 'Confirm Enrollment of Selected Users',
      areYouSure: 'Are you sure you want to enroll the following users into',
      noGoBack: 'No, go back',
      yesEnrollUsers: 'Yes, enroll users',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
      selectedUsers: {
        type: Array,
        required: true,
      },
    },
    computed: {
      editClassLink() {
        return {
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          id: this.classId,
        };
      },
    },
    methods: {
      getUsername(userId) {
        return this.facilityUsers.find(user => user.id === userId).username;
      },
      enrollUsers() {
        this.enrollUsersInClass(this.classId, this.selectedUsers).then(
          () => {
            this.close();
            this.$router.push(this.editClassLink);
          },
          (error) => {});
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
      },
      actions: {
        enrollUsersInClass: actions.enrollUsersInClass,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  ul
    list-style: none
    margin: 20px 0
    li
      line-height: 1.8em  

  .header
    text-align: center

  .confirm-btn, .undo-btn
    width: 48%

  .confirm-btn
    float: right

</style>

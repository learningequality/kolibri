<template>

  <core-modal :title="$tr('confirmEnrollment')" @cancel="close" class="confirm-modal">
    <div>
      <p>{{ $tr('areYouSure', {className}) }}</p>
      <ul class="review-enroll-ul">
        <li class="review-enroll-li" v-for="userId in selectedUsers" :key="userId"><strong>{{ getUsername(userId) }}</strong></li>
      </ul>
      <div class="modal-buttons">
        <k-button
          :text="$tr('noGoBack')"
          appearance="flat-button"
          @click="close" />
        <k-button
          :text="$tr('yesEnrollUsers')"
          :primary="true"
          @click="enrollUsers" />
      </div>
    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import * as constants from '../../constants';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  export default {
    name: 'confirmEnrollmentModal',
    $trs: {
      confirmEnrollment: 'Confirm Enrollment of Selected Users',
      areYouSure: 'Are you sure you want to enroll the following users into {className}?',
      noGoBack: 'No, go back',
      yesEnrollUsers: 'Yes, enroll learners',
    },
    components: {
      coreModal,
      kButton,
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
        this.enrollUsersInClass(this.classId, this.selectedUsers).then(() => {
          this.close();
          this.$router.push(this.editClassLink);
        });
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      getters: { facilityUsers: state => state.pageState.facilityUsers },
      actions: {
        enrollUsersInClass: actions.enrollUsersInClass,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .review-enroll-ul
    list-style: none
    margin: 20px 0

  .review-enroll-li
    line-height: 1.8em

  .header
    text-align: center

  .modal-buttons
    text-align: right

</style>

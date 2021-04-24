<template>

  <KPageContainer>

    <p>
      <KRouterLink
        :text="coreString('allClassesLabel')"
        :to="$store.getters.facilityPageLinks.ManageClassPage"
        icon="back"
      />
    </p>
    <div>
      <h1 class="title-header" dir="auto">
        <KLabeledIcon icon="classes" :label="currentClass.name" />
      </h1>
      <KButton
        :text="$tr('renameButtonLabel')"
        appearance="basic-link"
        :primary="true"
        :ariaLabel="$tr('edit')"
        @click="displayModal(Modals.EDIT_CLASS_NAME)"
      />
    </div>

    <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

    <!-- Modals -->
    <ClassRenameModal
      v-if="modalShown === Modals.EDIT_CLASS_NAME"
      :classname="currentClass.name"
      :classid="currentClass.id"
      :classes="classes"
      @cancel="closeModal"
    />
    <UserRemoveConfirmationModal
      v-if="modalShown === Modals.REMOVE_USER"
      :classname="currentClass.name"
      :username="userToBeRemoved.username"
      @submit="removalAction({ classId: currentClass.id, userId: userToBeRemoved.id })"
      @cancel="closeModal"
    />
    <!-- /Modals -->

    <KGrid>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h2>{{ coreString('coachesLabel') }}</h2>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <KRouterLink
          :text="$tr('assignCoachesButtonLabel')"
          :to="$store.getters.facilityPageLinks.CoachClassAssignmentPage"
          appearance="raised-button"
        />
      </KGridItem>
    </KGrid>

    <div>
      <CoreTable>
        <template #headers>
          <th>
            <!-- "Full name" header visually hidden if checkbox is on -->
            <span>
              {{ coreString('fullNameLabel') }}
            </span>
          </th>
          <th>
            <span class="visuallyhidden">
              {{ $tr('role') }}
            </span>
          </th>
          <th>{{ coreString('usernameLabel') }}</th>
          <th class="user-action-button">
            <span class="visuallyhidden">
              {{ $tr('userActionsColumnHeader') }}
            </span>
          </th>
        </template>

        <template #tbody>
          <tbody>
            <tr
              v-for="user in classCoaches"
              :key="user.id"
            >
              <td>
                <KLabeledIcon
                  icon="coach"
                  :label="user.full_name"
                />
                <UserTypeDisplay
                  aria-hidden="true"
                  :userType="user.kind"
                  :omitLearner="true"
                  class="role-badge"
                  :style="{
                    color: $themeTokens.textInverted,
                    backgroundColor: $themeTokens.annotation,
                  }"
                />
              </td>
              <td class="visuallyhidden">
                {{ user.kind }}
              </td>
              <td>
                <span dir="auto">
                  {{ user.username }}
                </span>
              </td>
              <td class="core-table-button-col">
                <template>
                  <KButton
                    :text="coreString('removeAction')"
                    appearance="flat-button"
                    @click="confirmRemoval(user, removeClassCoach)"
                  />
                </template>
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
      <p
        v-if="!classCoaches.length"
        class="empty-message"
      >
        {{ $tr('noCoachesInClassMessge') }}
      </p>

    </div>

    <KGrid class="top-margin">
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h2>{{ coreString('learnersLabel') }}</h2>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <KRouterLink
          :text="$tr('enrollLearnerButtonLabel')"
          :to="$store.getters.facilityPageLinks.LearnerClassEnrollmentPage"
          :primary="true"
          appearance="raised-button"
        />
      </KGridItem>
    </KGrid>

    <div>
      <CoreTable>
        <template #headers>
          <th>
            <!-- "Full name" header visually hidden if checkbox is on -->
            <span>
              {{ coreString('fullNameLabel') }}
            </span>
          </th>
          <th>
            <span class="visuallyhidden">
              {{ $tr('role') }}
            </span>
          </th>
          <th>{{ coreString('usernameLabel') }}</th>
          <th class="user-action-button">
            <span class="visuallyhidden">
              {{ $tr('userActionsColumnHeader') }}
            </span>
          </th>
        </template>

        <template #tbody>
          <tbody>
            <tr
              v-for="user in classLearners"
              :key="user.id"
            >
              <td>
                <KLabeledIcon
                  icon="person"
                  :label="user.full_name"
                />
                <UserTypeDisplay
                  aria-hidden="true"
                  :userType="user.kind"
                  :omitLearner="true"
                  class="role-badge"
                  :style="{
                    color: $themeTokens.textInverted,
                    backgroundColor: $themeTokens.annotation,
                  }"
                />
              </td>
              <td class="visuallyhidden">
                {{ user.kind }}
              </td>
              <td>
                <span dir="auto">
                  {{ user.username }}
                </span>
              </td>
              <td class="core-table-button-col">
                <template>
                  <KButton
                    :text="coreString('removeAction')"
                    appearance="flat-button"
                    @click="confirmRemoval(user, removeClassLearner)"
                  />
                </template>
              </td>
            </tr>
          </tbody>
        </template>
      </CoreTable>
      <p
        v-if="!classLearners.length"
        class="empty-message"
      >
        {{ $tr('noLearnersInClassMessage') }}
      </p>

    </div>

  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import { Modals } from '../../constants';
  import ClassRenameModal from './ClassRenameModal';
  import UserRemoveConfirmationModal from './UserRemoveConfirmationModal';

  export default {
    name: 'ClassEditPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ClassRenameModal,
      UserRemoveConfirmationModal,
      CoreTable,
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        userToBeRemoved: null,
        removalAction: null,
      };
    },
    computed: {
      ...mapState('classEditManagement', [
        'classCoaches',
        'classLearners',
        'classes',
        'currentClass',
        'modalShown',
      ]),
      Modals() {
        return Modals;
      },
    },
    methods: {
      ...mapActions('classEditManagement', ['displayModal']),
      closeModal() {
        this.displayModal(false);
      },
      confirmRemoval(user, removalAction) {
        this.userToBeRemoved = user;
        this.removalAction = removalAction;
        this.displayModal(Modals.REMOVE_USER);
      },
      removeClassCoach(args) {
        this.$store.dispatch('classEditManagement/removeClassCoach', args).then(() => {
          this.showSnackbarNotification('coachesRemovedNoCount', { count: 1 });
        });
      },
      removeClassLearner(args) {
        this.$store.dispatch('classEditManagement/removeClassLearner', args).then(() => {
          this.showSnackbarNotification('learnersRemovedNoCount', { count: 1 });
        });
      },
    },
    $trs: {
      enrollLearnerButtonLabel: 'Enroll learners',
      assignCoachesButtonLabel: 'Assign coaches',
      coachEnrollmentPageTitle: 'Manage class coaches and learners',
      noCoachesInClassMessge: "You don't have any assigned coaches",
      noLearnersInClassMessage: "You don't have any enrolled learners",
      edit: 'Edit class name',
      documentTitle: 'Edit Class',
      renameButtonLabel: 'Edit',
      role: 'Role',
      userActionsColumnHeader: 'Actions',
    },
  };

</script>


<style lang="scss" scoped>

  .title-header {
    display: inline-block;
    margin-right: 8px;
  }

  .top-margin {
    margin-top: 24px;
  }

  .empty-message {
    margin-bottom: 16px;
  }

  .role-badge {
    display: inline-block;
    padding: 0;
    padding-right: 8px;
    padding-left: 8px;
    margin-left: 16px;
    font-size: small;
    white-space: nowrap;
    border-radius: 4px;
  }

  .tooltip {
    margin-left: 2px;
  }

  td.id-col {
    max-width: 120px;
  }

</style>

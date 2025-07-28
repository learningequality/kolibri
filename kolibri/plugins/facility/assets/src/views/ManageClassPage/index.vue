<template>

  <FacilityAppBarPage>
    <KPageContainer>
      <p>
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'ManageClassPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
      </p>
      <KGrid>
        <KGridItem
          :layout8="{ span: 6 }"
          :layout12="{ span: 9 }"
        >
          <h1>{{ coreString('classesLabel') }}</h1>
          <p>{{ $tr('adminClassPageSubheader') }}</p>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 2 }"
          :layout12="{ span: 3 }"
        >
          <KButton
            :text="$tr('addNew')"
            :primary="true"
            class="move-down"
            @click="displayModal(Modals.CREATE_CLASS)"
          />
        </KGridItem>
      </KGrid>
      <KTable
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="$tr('tableCaption')"
        :emptyMessage="$tr('noClassesExist')"
        :dataLoading="dataLoading"
        sortable
      >
        <template #header="{ header, colIndex }">
          <span :class="{ visuallyhidden: colIndex === 3 }"> {{ header.label }}</span>
        </template>
        <template #cell="{ content, colIndex, row }">
          <span v-if="colIndex === 0">
            <KRouterLink
              class="class-name"
              :text="content"
              :to="$store.getters.facilityPageLinks.ClassEditPage(row[3].id)"
              icon="classes"
            />
          </span>
          <span v-else-if="colIndex === 1">
            <KOptionalText :text="coachNames(row[3]).length ? formattedCoachNames(row[3]) : ''" />
            <KTooltip
              v-if="formattedCoachNamesTooltip(row[3])"
              :reference="`coachNames${row[3].id}`"
              :refs="$refs"
            >
              {{ formattedCoachNamesTooltip(row[3]) }}
            </KTooltip>
          </span>
          <span
            v-else-if="colIndex === 2"
            style="display: flex; justify-content: start"
          >
            {{ content }}
          </span>
          <span
            v-else-if="colIndex === 3"
            class="core-table-button-col"
          >
            <KIconButton icon="optionsVertical">
              <template #menu>
                <KDropdownMenu
                  :options="dropDownOptions"
                  @select="handleOptionSelection($event, row[3])"
                />
              </template>
            </KIconButton>
          </span>
        </template>
      </KTable>

      <ClassDeleteModal
        v-if="Boolean(classToDelete)"
        :classToDelete="classToDelete"
        @cancel="clearClassToDelete"
        @success="handleDeleteSuccess()"
      />
      <ClassCreateModal
        v-if="modalShown === Modals.CREATE_CLASS"
        :classes="classes"
        @cancel="closeModal"
        @success="handleCreateSuccess()"
      />

      <ClassRenameModal
        v-if="openRenameModal"
        :classname="classDetails.name"
        :classid="classDetails.id"
        :classes="classes"
        @cancel="closeModal"
        @success="handleRenameSuccess()"
      />

      <CopyClassSidePanel
        v-if="openCopyClassPanel"
        :coachesIds="classCoachesIds"
        :classroom="tableRows"
        :className="copiedClassName"
        :classCoaches="classCoaches"
        :classes="classes"
        @closeSidePanel="closeModal"
      />
    </KPageContainer>
  </FacilityAppBarPage>

</template>


<script>

  import { ref, getCurrentInstance } from 'vue';
  import { mapState, mapActions, mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { UserKinds } from 'kolibri/constants';
  import { Modals } from '../../constants';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import ClassRenameModal from '../ClassEditPage/ClassRenameModal.vue';
  import ClassCreateModal from './ClassCreateModal';
  import ClassDeleteModal from './ClassDeleteModal';
  import useDeleteClass from './useDeleteClass';
  import CopyClassSidePanel from './CopyClassSidePanel.vue';

  export default {
    name: 'ManageClassPage',
    metaInfo() {
      return {
        title: this.coreString('classesLabel'),
      };
    },
    components: {
      FacilityAppBarPage,
      ClassCreateModal,
      ClassDeleteModal,
      ClassRenameModal,
      CopyClassSidePanel,
    },
    mixins: [commonCoreStrings],
    setup() {
      const classDetails = ref({
        id: '',
        name: '',
      });
      const classCoachesIds = ref([]);
      const classCoaches = ref([]);
      const facilityUsers = ref([]);
      const copiedClassName = ref(null);
      const openCopyClassPanel = ref(false);
      const openRenameModal = ref(false);
      const { classToDelete, selectClassToDelete, clearClassToDelete } = useDeleteClass();
      const { getFacilities, userIsMultiFacilityAdmin } = useFacilities();

      const { $store, $router } = getCurrentInstance().proxy;
      const activeFacilityId =
        $router.currentRoute.params.facility_id || $store.getters.activeFacilityId;

      const { copyClasslabel$, renameClassLabel$, copyOfClass$ } = bulkUserManagementStrings;

      const fetchFacilityUsers = async () => {
        const resp = await FacilityUserResource.fetchCollection({
          getParams: {
            member_of: activeFacilityId,
            user_type: UserKinds.COACH,
          },
          force: true,
        });
        facilityUsers.value = resp;
      };

      const handleOptionSelection = (selection, classroom) => {
        classDetails.value = classroom;
        copiedClassName.value = copyOfClass$({ class: classDetails.value.name });

        classCoachesIds.value = classDetails.value.coaches.map(coach => coach.id);
        classCoaches.value = facilityUsers.value.map(coach => ({
          id: coach.id,
          username: coach.username,
          full_name: coach.full_name,
          label: coach.full_name,
        }));

        if (selection.value === Modals.DELETE_CLASS) {
          selectClassToDelete(classroom);
          return;
        }

        if (selection.value === Modals.EDIT_CLASS_NAME) {
          openRenameModal.value = true;
          return;
        }

        if (selection.value === Modals.COPY_CLASS) {
          openCopyClassPanel.value = true;
          return;
        }
      };
      fetchFacilityUsers();
      return {
        classToDelete,
        clearClassToDelete,
        userIsMultiFacilityAdmin,
        getFacilities,
        copyClasslabel$,
        renameClassLabel$,
        classDetails,
        classCoachesIds,
        openCopyClassPanel,
        copiedClassName,
        classCoaches,
        handleOptionSelection,
        openRenameModal,
      };
    },
    computed: {
      ...mapState('classManagement', ['modalShown', 'classes', 'dataLoading']),
      ...mapGetters(['facilityPageLinks']),

      Modals: () => Modals,
      tableHeaders() {
        return [
          {
            label: this.coreString('classNameLabel'),
            dataType: 'string',
            minWidth: '300px',
            width: '30%',
            columnId: 'classname',
          },
          {
            label: this.coreString('coachesLabel'),
            dataType: 'string',
            minWidth: '250px',
            width: '30%',
            columnId: 'coaches',
          },
          {
            label: this.coreString('learnersLabel'),
            dataType: 'string',
            minWidth: '250px',
            width: '30%',
            columnId: 'learners',
          },
          {
            label: this.coreString('userActionsColumnHeader'),
            dataType: 'undefined',
            minWidth: '100px',
            width: '30%',
            columnId: 'userActions',
          },
        ];
      },
      tableRows() {
        return this.classes.map(classroom => [
          classroom.name,
          this.formattedCoachNames(classroom),
          this.$formatNumber(classroom.learner_count),
          classroom,
        ]);
      },
      dropDownOptions() {
        return [
          {
            label: this.copyClasslabel$(),
            value: 'COPY_CLASS',
            id: 'copy',
          },
          {
            label: this.renameClassLabel$(),
            value: 'EDIT_CLASS_NAME',
            id: 'rename',
          },
          {
            label: this.$tr('deleteClass'),
            value: 'DELETE_CLASS',
            id: 'delete',
          },
        ];
      },
    },
    methods: {
      ...mapActions('classManagement', ['displayModal']),
      closeModal() {
        this.openRenameModal = false;
        this.openCopyClassPanel = false;
        this.displayModal(false);
      },
      handleCreateSuccess() {
        this.closeModal();
        this.refreshCoreFacilities();
      },
      handleDeleteSuccess() {
        this.clearClassToDelete();
        this.refreshCoreFacilities();
      },
      refreshCoreFacilities() {
        if (this.userIsMultiFacilityAdmin) {
          // Update the core facilities object to update classroom number
          this.getFacilities();
        }
      },
      handleRenameSuccess() {
        this.openRenameModal = false;
        this.refreshCoreFacilities();
      },
      // Duplicated in class-list-page
      coachNames(classes) {
        const { coaches } = classes;
        return coaches.map(({ full_name }) => full_name);
      },
      formattedCoachNames(classroom) {
        const coach_names = this.coachNames(classroom);

        if (coach_names.length === 1) {
          return coach_names[0];
        }
        if (coach_names.length === 2) {
          return this.$tr('twoCoachNames', {
            name1: coach_names[0],
            name2: coach_names[1],
          });
        }
        return this.$tr('manyCoachNames', {
          name1: coach_names[0],
          name2: coach_names[1],
          numRemaining: coach_names.length - 2,
        });
      },
      formattedCoachNamesTooltip(classroom) {
        const coach_names = this.coachNames(classroom);
        if (coach_names.length > 2) {
          return coach_names.join('\n');
        }
        return null;
      },
    },
    $trs: {
      adminClassPageSubheader: {
        message: 'View and manage your classes',
        context: 'Description on Facility > Classes page.',
      },
      addNew: {
        message: 'New class',
        context: 'Button used to create a new class.',
      },
      deleteClass: {
        message: 'Delete class',
        context: 'Option to delete a class.',
      },
      tableCaption: {
        message: 'List of classes',
        context: 'Caption for the table containing the list of classes.',
      },
      twoCoachNames: {
        message: '{name1}, {name2}',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      manyCoachNames: {
        message: '{name1}, {name2}… (+{numRemaining, number})',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      noClassesExist: {
        message: 'No classes exist',
        context:
          'Message that displays when there are no classes created in the Facility > Classes section.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

  .class-name {
    font-size: 14px;
  }

</style>

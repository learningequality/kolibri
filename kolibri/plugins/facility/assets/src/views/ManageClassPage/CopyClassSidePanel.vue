<template>

  <div>
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      closeButtonIconType="close"
      @closePanel="closeSidePanelModal"
    >
      <template #header>
        <h1 class="side-panel-title">{{ copyClasslabel$() }}</h1>
      </template>
      <template #default>
        <div>
          <KTextbox
            v-model="copiedClassName"
            type="text"
            :label="coreString('classNameLabel')"
            :autofocus="true"
            :maxlength="100"
            :showInvalidText="true"
            :invalid="Boolean(classNameInvalidText)"
            :invalidText="classNameInvalidText"
          />

          <p
            id="coaches-assigned-label"
            class="side-panel-subtitle"
          >
            {{ coachesAssignedToClassLabel$() }}
          </p>
          <SelectableList
            :value="classCoachesIds"
            :options="classCoaches"
            ariaLabelledby="coaches-assigned-label"
            :selectAllLabel="selectAllLabel$()"
            :searchLabel="coreString('searchLabel')"
            @input="handleSelection"
          >
            <template #option="{ option }">
              <span>
                {{ option.label }}
                <UserTypeDisplay
                  aria-hidden="true"
                  userType="coach"
                  :omitLearner="true"
                  :distinguishCoachTypes="false"
                  data-test="userRoleBadge"
                  :class="$computedClass(userRoleBadgeStyle)"
                />
              </span>
            </template>
          </SelectableList>
        </div>
      </template>

      <template #bottomNavigation>
        <div class="bottom-nav">
          <div>{{ numCoachesSelected$({ n: classCoachesIds.length }) }}</div>
          <div>
            <KButton
              :text="coreString('cancelAction')"
              appearance="raised-button"
              class="cancel-copy-class-button"
              @click="closeSidePanelModal"
            />

            <KButton
              :text="copyClasslabel$()"
              :primary="true"
              :disabled="Boolean(classNameInvalidText) || submitting"
              @click="openConfirmationModal"
            />
          </div>
        </div>
      </template>
    </SidePanelModal>

    <ConfirmCopyClassModal
      v-if="isModalOpen"
      @confirm="handleSubmitingClassCopy"
      @cancel="isModalOpen = false"
    />
  </div>

</template>


<script>

  import { ref } from 'vue';
  import { mapActions } from 'vuex';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import UserTypeDisplay from 'kolibri-common/components/UserTypeDisplay';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import SelectableList from '../common/SelectableList.vue';
  import ConfirmCopyClassModal from './ConfirmCopyClassModal.vue';

  export default {
    name: 'CopyClassSidePanel',
    components: {
      SelectableList,
      SidePanelModal,
      UserTypeDisplay,
      ConfirmCopyClassModal,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const classCoachesIds = ref([]);
      const copiedClassName = ref(null);
      const submitting = ref(false);
      const isModalOpen = ref(false);
      const hasDataChanged = ref(false);
      const { className } = props;

      const {
        coachesAssignedToClassLabel$,
        selectAllLabel$,
        numCoachesSelected$,
        classNameAlreadyExists$,
        copyClasslabel$,
        classCopiedSuccessfully$,
      } = bulkUserManagementStrings;
      const { createSnackbar } = useSnackbar();

      const handleSelection = newSelection => {
        classCoachesIds.value = newSelection;
      };

      const setClassNameAndCoachIds = () => {
        copiedClassName.value = className;
        classCoachesIds.value = props.coachesIds;
      };

      const openConfirmationModal = () => {
        isModalOpen.value = true;
      };

      setClassNameAndCoachIds();

      return {
        coachesAssignedToClassLabel$,
        selectAllLabel$,
        numCoachesSelected$,
        copyClasslabel$,
        classNameAlreadyExists$,
        classCopiedSuccessfully$,
        handleSelection,
        copiedClassName,
        createSnackbar,
        classCoachesIds,
        submitting,
        openConfirmationModal,
        isModalOpen,
        hasDataChanged,
      };
    },
    props: {
      coachesIds: {
        type: Array,
        required: true,
      },
      classroom: {
        type: Array,
        required: true,
      },
      classCoaches: {
        type: Array,
        required: true,
      },
      className: {
        type: String,
        required: true,
      },
      classes: {
        type: Array,
        required: true,
      },
    },
    computed: {
      classNameInvalidText() {
        if (!this.submitting) {
          const name = (this.copiedClassName || '').trim();
          if (!name) {
            return this.coreString('requiredFieldError');
          } else if (this.classroom.some(row => row[0] === name)) {
            return this.classNameAlreadyExists$();
          }
        }
        return '';
      },
      userRoleBadgeStyle() {
        return {
          color: this.$themePalette.grey.v_800,
          backgroundColor: this.$themePalette.grey.v_300,
          padding: '0.3em',
          borderRadius: '2px',
          fontSize: '10px',
          '::selection': {
            color: this.$themeTokens.text,
          },
        };
      },
    },
    watch: {
      copiedClassName(newValue) {
        if (newValue) {
          this.hasDataChanged = true;
        }
      },
      classCoachesIds(newValue) {
        if (newValue) {
          this.hasDataChanged = true;
        }
      },
    },
    beforeRouteLeave(to, __, next) {
      if (this.hasDataChanged) {
        this.isModalOpen = true;
        next(false);
      } else {
        next();
      }
    },
    methods: {
      ...mapActions('classAssignMembers', ['assignCoachesToClass']),
      closeSidePanelModal() {
        this.$emit('closeSidePanel');
      },
      async handleSubmitingClassCopy() {
        this.submitting = true;

        try {
          await this.$store.dispatch('classManagement/createClass', this.copiedClassName);
          await this.$nextTick();

          const createdClass = this.classes.find(cls => cls.name === this.copiedClassName);

          if (createdClass?.id) {
            const coaches = this.classCoachesIds;

            await this.assignCoachesToClass({
              classId: createdClass.id,
              coaches,
            });

            const updatedClasses = this.classes.map(c => {
              if (c.name === this.copiedClassName) {
                const updatedCoaches = coaches
                  .map(coachId => this.classCoaches.find(coach => coach.id === coachId))
                  .filter(Boolean);

                return { ...c, coaches: updatedCoaches };
              }
              return c;
            });

            this.closeSidePanelModal();
            this.$store.commit('classManagement/SET_STATE', { classes: updatedClasses });
            this.createSnackbar(this.classCopiedSuccessfully$());
          }
        } finally {
          this.submitting = false;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .bottom-nav {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .cancel-copy-class-button {
    margin-right: 1em;
  }

  .side-panel-subtitle {
    font-size: 16px;
    font-weight: bold;
  }

  .side-panel-title {
    margin-left: 15px;
    font-size: 18px;
    font-weight: 600;
  }

  /deep/ .textbox {
    max-width: 100% !important;
  }

  .description-ktextbox-style /deep/ .ui-textbox-label {
    width: 100%;
  }

</style>

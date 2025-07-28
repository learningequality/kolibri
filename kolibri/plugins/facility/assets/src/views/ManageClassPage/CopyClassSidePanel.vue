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
            :label="classTitleLabel$()"
            :autofocus="true"
            :maxlength="100"
            :showInvalidText="true"
            :invalid="isClassNameInvalid"
            :invalidText="classNameAlreadyExists$()"
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
                {{ option }}
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
              :disabled="isClassNameInvalid"
              @click="handleSubmitingClassCopy"
            />
          </div>
        </div>
      </template>
    </SidePanelModal>
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
  import SelectableList from './SelectableList.vue';

  export default {
    name: 'CopyClassSidePanel',
    components: {
      SelectableList,
      SidePanelModal,
      UserTypeDisplay,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const classCoachesIds = ref([]);
      const copiedClassName = ref(null);
      const { className } = props;

      const {
        coachesAssignedToClassLabel$,
        classTitleLabel$,
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

      setClassNameAndCoachIds();

      return {
        coachesAssignedToClassLabel$,
        classTitleLabel$,
        selectAllLabel$,
        numCoachesSelected$,
        copyClasslabel$,
        classNameAlreadyExists$,
        classCopiedSuccessfully$,
        handleSelection,
        copiedClassName,
        createSnackbar,
        classCoachesIds,
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
      isClassNameInvalid() {
        return this.classroom.some(row => row[0] === this.copiedClassName) && !this.submitting;
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

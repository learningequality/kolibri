<template>

  <SidePanelModal
    hideHeaderBorder
    alignment="right"
    sidePanelWidth="700px"
    class="bum-side-panel"
    closeButtonIconType="close"
    :contentContainerStyleOverrides="{ padding: '0px 24px 24px' }"
    :headerContainerStyleOverrides="{ paddingLeft: '24px', paddingRight: '24px' }"
    @closePanel="close"
  >
    <template #header>
      <h1 class="side-panel-title">
        {{ $tr('createNewUserHeader') }}
      </h1>
    </template>
    <template #default>
      <LearnerLimitReachedModal
        v-if="showLearnerLimitModal"
        @close="showLearnerLimitModal = false"
      />
      <div
        v-if="showErrorWarning"
        :style="{ color: $themeTokens.error }"
        class="warning-text"
      >
        <span>{{ defaultErrorMessage$() }}</span>
      </div>
      <form
        v-if="!loading"
        :id="formId"
        class="form"
      >
        <section>
          <FullNameTextbox
            ref="fullNameTextbox"
            :autofocus="true"
            :disabled="busy"
            :value.sync="fullName"
            :isValid.sync="fullNameValid"
            :shouldValidate="formSubmitted"
          />

          <UsernameTextbox
            ref="usernameTextbox"
            :disabled="busy"
            :value.sync="username"
            :isValid.sync="usernameValid"
            :shouldValidate="formSubmitted"
            :isUniqueValidator="usernameIsUnique"
            :errors.sync="caughtErrors"
          />
          <template v-if="showPasswordInput">
            <PasswordTextbox
              ref="passwordTextbox"
              :disabled="busy"
              :value.sync="password"
              :isValid.sync="passwordValid"
              :shouldValidate="formSubmitted"
            />
          </template>
          <KSelect
            v-model="kind"
            class="select"
            :disabled="busy"
            :label="userTypeLabel$()"
            :options="userTypeOptions"
          />
          <div
            v-if="userCreationBlocked"
            class="learner-limit-message"
            :style="{ color: $themeTokens.annotation }"
          >
            <KIcon
              icon="warning"
              :style="{ fill: $themePalette.yellow.v_600 }"
            />
            <span>
              {{ learnerCreationDisabled$() }}
              <KButton
                appearance="basic-link"
                :text="learnMoreAction$()"
                :aria-label="learnerCreationDisabled$() + ' ' + learnMoreAction$()"
                data-testid="learn-more-button"
                @click="showLearnerLimitModal = true"
              />
            </span>
          </div>

          <fieldset
            v-if="coachIsSelected"
            class="coach-selector"
            data-testid="coach-type-selector"
          >
            <KRadioButtonGroup>
              <KRadioButton
                v-model="classCoachIsSelected"
                :disabled="busy"
                :label="classCoachLabel$()"
                :description="classCoachDescription$()"
                :buttonValue="true"
              />
              <KRadioButton
                v-model="classCoachIsSelected"
                :disabled="busy"
                :label="facilityCoachLabel$()"
                :description="facilityCoachDescription$()"
                :buttonValue="false"
              />
            </KRadioButtonGroup>
          </fieldset>

          <IdentifierTextbox
            :value.sync="idNumber"
            :disabled="busy"
          />

          <BirthYearSelect
            :value.sync="birthYear"
            :disabled="busy"
            class="select"
          />

          <GenderSelect
            :value.sync="gender"
            :disabled="busy"
            class="select"
          />

          <ClassesSelect
            v-model="selectedClasses"
            :classes="classes"
            :disabled="busy || !classes.length"
            :action="classesAction"
          />

          <ExtraDemographics
            v-model="extraDemographics"
            :facilityDatasetExtraFields="facilityConfig.extra_fields"
            :disabled="busy"
          />

          <div
            v-if="showPicturePasswordInfo"
            data-testid="picture-password-info"
            class="picture-password-info"
          >
            <h5 class="picture-password-info-heading">
              {{ signingInHeading$() }}
            </h5>
            <p class="picture-password-info-text">
              {{ learnersPictureSignInInfo$() }}
            </p>
            <p class="picture-password-info-text">
              {{ picturePasswordWillBeAssigned$() }}
            </p>
          </div>
        </section>
      </form>
      <CloseConfirmationGuard
        ref="closeConfirmationGuardRef"
        :hasUnsavedChanges="hasUnsavedChanges"
      />
    </template>
    <template #bottomNavigation>
      <div class="bottom-nav-container">
        <KButton
          primary
          :form="formId"
          :text="saveAndClose$()"
          :disabled="busy || userCreationBlocked"
          @click="saveAndClose()"
        />
        <KButton
          :form="formId"
          :text="saveAndAddAnother$()"
          :disabled="busy || userCreationBlocked"
          @click="saveAndAddAnother()"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import store from 'kolibri/store';
  import { ref, computed, nextTick, onBeforeMount, getCurrentInstance } from 'vue';
  import { useRouter, onBeforeRouteLeave } from 'vue-router/composables';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import notificationStrings from 'kolibri/uiText/notificationStrings';
  import RoleResource from 'kolibri-common/apiResources/RoleResource';
  import useFacility from 'kolibri-common/composables/useFacility';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import ExtraDemographics from 'kolibri-common/components/ExtraDemographics';
  import GenderSelect from 'kolibri-common/components/userAccounts/GenderSelect';
  import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { UserKinds, ERROR_CONSTANTS, DemographicConstants } from 'kolibri/constants';
  import BirthYearSelect from 'kolibri-common/components/userAccounts/BirthYearSelect';
  import FullNameTextbox from 'kolibri-common/components/userAccounts/FullNameTextbox';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';

  import CloseConfirmationGuard from '../../common/CloseConfirmationGuard.vue';
  import LearnerLimitReachedModal from '../../../LearnerLimitReachedModal.vue';
  import { ClassesActions } from '../../../../constants';
  import IdentifierTextbox from './IdentifierTextbox.vue';
  import ClassesSelect from './ClassesSelect.vue';

  const { NOT_SPECIFIED } = DemographicConstants;

  export default {
    name: 'UserCreateSidePanel',
    metaInfo() {
      return {
        title: this.$tr('createNewUserHeader'),
      };
    },
    components: {
      GenderSelect,
      ClassesSelect,
      BirthYearSelect,
      UsernameTextbox,
      FullNameTextbox,
      PasswordTextbox,
      IdentifierTextbox,
      SidePanelModal,
      ExtraDemographics,
      CloseConfirmationGuard,
      LearnerLimitReachedModal,
    },
    setup(props) {
      const formId = 'create-user-form';
      const router = useRouter();
      const instance = getCurrentInstance();
      const $refs = instance.proxy.$refs;
      const {
        facilityConfig,
        selectedFacility,
        facilityId,
        fetchFacilities,
        isPictureLoginFeatureEnabled,
      } = useFacility();
      const picturePasswordSettings = computed(
        () => facilityConfig.value?.picture_password_settings || null,
      );
      const { createSnackbar } = useSnackbar();

      const showLearnerLimitModal = ref(false);

      const isPictureLoginActive = computed(
        () => isPictureLoginFeatureEnabled.value && picturePasswordSettings.value != null,
      );
      const learnerLimitReached = computed(
        () => isPictureLoginActive.value && selectedFacility.value?.picture_passwords_exhausted,
      );

      const coachIsSelected = computed(() => {
        return kind.value?.value === UserKinds.COACH;
      });

      const newUserRole = computed(() => {
        if (coachIsSelected.value) {
          return classCoachIsSelected.value ? UserKinds.ASSIGNABLE_COACH : UserKinds.COACH;
        }
        // Admin or Learner
        return kind.value?.value ?? UserKinds.LEARNER;
      });

      const showPicturePasswordInfo = computed(
        () => isPictureLoginActive.value && newUserRole.value === UserKinds.LEARNER,
      );

      const userTypeOptions = [
        {
          label: coreStrings.learnerLabel$(),
          value: UserKinds.LEARNER,
        },
        {
          label: coreStrings.coachLabel$(),
          value: UserKinds.COACH,
        },
        {
          label: coreStrings.adminLabel$(),
          value: UserKinds.ADMIN,
        },
      ];

      const userCreationBlocked = computed(
        () => newUserRole.value === UserKinds.LEARNER && learnerLimitReached.value,
      );

      const closeConfirmationGuardRef = ref(null);

      const fullName = ref('');
      const fullNameValid = ref(false);
      const username = ref('');
      const usernameValid = ref(false);
      const password = ref('');
      const passwordValid = ref(false);
      const gender = ref(NOT_SPECIFIED);
      const birthYear = ref(NOT_SPECIFIED);
      const extraDemographics = ref({});
      const idNumber = ref('');
      const loading = ref(true);
      const kind = ref(userTypeOptions[0]);
      const selectedClasses = ref([]);
      const classCoachIsSelected = ref(true);
      const busy = ref(false);
      const formSubmitted = ref(false);
      const caughtErrors = ref([]);
      const showErrorWarning = ref(false);

      const resetForm = () => {
        fullName.value = '';
        username.value = '';
        password.value = '';
        gender.value = NOT_SPECIFIED;
        birthYear.value = NOT_SPECIFIED;
        extraDemographics.value = {};
        idNumber.value = '';
        classCoachIsSelected.value = true;
        kind.value = userTypeOptions[0];
        formSubmitted.value = false;
        caughtErrors.value = [];
        busy.value = false;
        selectedClasses.value = [];
        $refs.fullNameTextbox?.reset();
        $refs.usernameTextbox?.reset();
        $refs.passwordTextbox?.reset();
      };

      const facilityUsers = computed(() => store.state.userManagement.facilityUsers);

      const showPasswordInput = computed(() => {
        if (isPictureLoginActive.value || facilityConfig.value.learner_can_login_with_no_password) {
          return newUserRole.value !== UserKinds.LEARNER;
        }
        return true;
      });

      const formIsValid = computed(() => {
        return [fullNameValid.value, usernameValid.value, passwordValid.value].every(Boolean);
      });

      const hasUnsavedChanges = computed(() => {
        const formValuesUnsaved = [
          fullName.value,
          username.value,
          password.value,
          idNumber.value,
          gender.value !== NOT_SPECIFIED,
          birthYear.value !== NOT_SPECIFIED,
          kind.value !== userTypeOptions[0],
          Object.values(extraDemographics.value).some(value => {
            if (Array.isArray(value)) {
              return value.length > 0;
            }
            return Boolean(value);
          }),
          selectedClasses.value.length > 0,
        ];
        return formValuesUnsaved.some(Boolean);
      });

      const classesAction = computed(() =>
        newUserRole.value === UserKinds.LEARNER
          ? ClassesActions.ENROLL_LEARNER
          : ClassesActions.ASSIGN_COACH,
      );

      const usernameIsUnique = value => {
        return !facilityUsers.value.find(
          ({ username }) => username.toLowerCase() === value.toLowerCase(),
        );
      };

      const focusOnInvalidField = async () => {
        await nextTick();
        if (!fullNameValid.value) {
          $refs.fullNameTextbox.focus();
        } else if (!usernameValid.value) {
          $refs.usernameTextbox.focus();
        } else if (!passwordValid.value) {
          $refs.passwordTextbox.focus();
        }
      };

      const handleSubmitSuccess = async () => {
        await fetchFacilities();
        createSnackbar(notificationStrings.userCreated$());
        props.onChange();
      };

      const handleSubmitFailure = error => {
        caughtErrors.value = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
        busy.value = false;
        if (caughtErrors.value.length > 0) {
          focusOnInvalidField();
        } else {
          showErrorWarning.value = true;
        }
      };

      const saveUserRole = (facilityUser, newRoleKind) => {
        const { id, facility } = facilityUser;
        return RoleResource.saveModel({
          data: {
            user: id,
            collection: facility,
            kind: newRoleKind,
          },
        });
      };

      const enrollLearnerInClasses = (userId, classIds) => {
        return MembershipResource.saveCollection({
          data: classIds.map(classId => ({
            collection: classId,
            user: userId,
          })),
        });
      };

      const assignCoachToClasses = (userId, classIds) => {
        return RoleResource.saveCollection({
          data: classIds.map(classId => ({
            collection: classId,
            user: userId,
            kind: UserKinds.COACH,
          })),
        });
      };

      const createFacilityUser = async () => {
        let passwordValue = password.value;
        if (!showPasswordInput.value) {
          passwordValue = NOT_SPECIFIED;
        }
        const facilityUser = await FacilityUserResource.saveModel({
          data: {
            facility: facilityId.value,
            username: username.value,
            full_name: fullName.value,
            password: passwordValue,
            id_number: idNumber.value,
            gender: gender.value,
            birth_year: birthYear.value,
            extra_demographics: extraDemographics.value,
          },
        });
        if (newUserRole.value !== UserKinds.LEARNER) {
          await saveUserRole(facilityUser, newUserRole.value);
        }
        if (selectedClasses.value.length > 0) {
          if (classesAction.value === ClassesActions.ASSIGN_COACH) {
            await assignCoachToClasses(facilityUser.id, selectedClasses.value);
          } else {
            await enrollLearnerInClasses(facilityUser.id, selectedClasses.value);
          }
        }
      };

      const submitForm = async () => {
        if (userCreationBlocked.value) {
          return false;
        }
        formSubmitted.value = true;
        if (!showPasswordInput.value && !passwordValid.value) {
          passwordValid.value = true;
        }
        if (!formIsValid.value) {
          return focusOnInvalidField();
        }
        busy.value = true;

        try {
          await createFacilityUser();
        } catch (error) {
          handleSubmitFailure(error);
          return false;
        }

        await handleSubmitSuccess();
        return true;
      };

      const close = () => {
        if (props.backRoute) {
          router.push(props.backRoute);
        } else {
          router.back();
        }
      };

      const saveAndClose = async () => {
        const success = await submitForm();
        if (success) {
          // Reset form to reset the hasUnsavedChanges state and
          // prevent the close confirmation modal from showing
          resetForm();
          await nextTick();
          close();
        }
      };

      const saveAndAddAnother = async () => {
        const success = await submitForm();
        if (success) {
          resetForm();
          await nextTick();
          $refs.fullNameTextbox.focus();
        }
      };

      onBeforeMount(async () => {
        // facilityConfig is now loaded; reset form so kind reflects picture_passwords_exhausted.
        resetForm();
        loading.value = false;
      });

      onBeforeRouteLeave((to, from, next) => {
        closeConfirmationGuardRef.value?.beforeRouteLeave(to, from, next);
      });

      const {
        saveAndClose$,
        learnMoreAction$,
        userTypeLabel$,
        classCoachLabel$,
        classCoachDescription$,
        facilityCoachLabel$,
        facilityCoachDescription$,
      } = coreStrings;
      const { saveAndAddAnother$, defaultErrorMessage$ } = bulkUserManagementStrings;
      const {
        learnerCreationDisabled$,
        picturePasswordWillBeAssigned$,
        signingInHeading$,
        learnersPictureSignInInfo$,
      } = picturePasswordStrings;

      return {
        classesAction,
        fullName,
        fullNameValid,
        username,
        usernameValid,
        password,
        passwordValid,
        gender,
        birthYear,
        extraDemographics,
        idNumber,
        loading,
        kind,
        hasUnsavedChanges,
        closeConfirmationGuardRef,
        classCoachIsSelected,
        selectedClasses,
        busy,
        formSubmitted,
        caughtErrors,
        showPasswordInput,
        coachIsSelected,
        userTypeOptions,
        close,
        usernameIsUnique,
        saveAndAddAnother,
        saveAndClose,
        formId,
        facilityConfig,
        saveAndClose$,
        saveAndAddAnother$,
        defaultErrorMessage$,
        showErrorWarning,
        userTypeLabel$,
        classCoachLabel$,
        classCoachDescription$,
        facilityCoachLabel$,
        facilityCoachDescription$,
        // picture password
        userCreationBlocked,
        showPicturePasswordInfo,
        showLearnerLimitModal,

        learnerCreationDisabled$,
        picturePasswordWillBeAssigned$,
        signingInHeading$,
        learnersPictureSignInInfo$,
        learnMoreAction$,
      };
    },
    props: {
      backRoute: {
        type: Object,
        default: null,
      },
      classes: {
        type: Array,
        default: () => [],
      },
      onChange: {
        type: Function,
        default: () => {},
      },
    },
    $trs: {
      createNewUserHeader: {
        message: 'Create new user',
        context:
          "Refers to the window accessed via the 'New user' button in the Facility > Users section.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common';

  .bum-side-panel {
    @include bum-side-panel;
  }

  .coach-selector {
    padding: 0;
    margin: 0;
    margin-bottom: 16px;
    border: 0;
  }

  .select {
    margin: 18px 0 20px;
  }

  .form {
    width: 100%;
  }

  /deep/ .textbox {
    max-width: 100% !important;
  }

  .warning-text {
    margin-bottom: 10px;
    margin-left: 5px;
  }

  .learner-limit-message {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
    font-size: 0.875em;
  }

  .picture-password-info {
    margin-top: 24px;
    margin-bottom: 24px;
  }

  .picture-password-info-text {
    margin: 0 0 4px;
    font-size: 0.875em;
  }

  .picture-password-info-heading {
    margin-bottom: 6px;
  }

</style>

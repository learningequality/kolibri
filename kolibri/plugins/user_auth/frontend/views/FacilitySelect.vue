<template>

  <AuthBase :hideFacilityBasedOptions="true">
    <div class="facility-select">
      <AuthContextHeading
        :useBackAction="true"
        :backLabel="userString('goBackToHomeAction')"
        :backTo="backTo"
        :title="heading"
      />
      <div v-if="facilityList['enabled'].length">
        <p class="label">
          {{ label }}
        </p>
        <div
          v-for="facility in facilityList['enabled']"
          :key="facility.id"
          class="facility-name"
        >
          <KButton
            appearance="raised-button"
            :primary="false"
            @click="selectFacility(facility.id)"
          >
            <template #icon>
              <KIcon
                icon="facility"
                class="facility-icon"
              />
            </template>
            {{ facility.name }}
          </KButton>
        </div>
      </div>
      <div
        v-if="facilityList['disabled'].length"
        :class="{ 'disabled-facilities': facilityList['enabled'].length }"
      >
        <p class="label">
          {{ $tr('askAdminForAccountLabel') }}
        </p>
        <div
          v-for="facility in facilityList['disabled']"
          :key="facility.id"
          class="facility-name"
        >
          <KButton
            :disabled="true"
            :primary="false"
            appearance="raised-button"
          >
            <template #icon>
              <KIcon
                icon="facility"
                class="facility-icon"
              />
            </template>
            {{ facility.name }}
          </KButton>
        </div>
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import partition from 'lodash/partition';
  import { useRouter, useRoute } from 'vue-router/composables';
  import commonCoreStrings, { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { computed } from 'vue';
  import useAuthFlow from '../composables/useAuthFlow';
  import useAuthWatcher from '../composables/useAuthWatcher';
  import useAuthRouter from '../composables/useAuthRouter';
  import AuthBase from './AuthBase';
  import commonUserStrings, { userString } from './commonUserStrings';
  import AuthContextHeading from './AuthContextHeading.vue';

  export default {
    name: 'FacilitySelect',
    components: { AuthContextHeading, AuthBase },
    mixins: [commonCoreStrings, commonUserStrings],
    setup(props) {
      const route = useRoute();
      const router = useRouter();
      const { homeRoute, signInRoute, signUpRoute } = useAuthRouter(route);
      const { facilities, facilityId, setFacilityId } = useAuthFlow();
      const { watchForFacilityChange } = useAuthWatcher();

      const backTo = computed(() => homeRoute.value);
      const heading = computed(() => {
        return props.signUpNext ? userString('createAccountAction') : coreString('facilitiesLabel');
      });

      /**
       * Navigate to sign-in or sign-up page
       */
      function navigateToSignIn() {
        router.push(props.signUpNext ? signUpRoute.value : signInRoute.value);
      }

      // facilityId is synchronized to local storage, so if multiple tabs change it, this should
      // keep the page in sync, also catches where facility ID is changing from persisted selection
      watchForFacilityChange((newFacilityId, oldFacilityId) => {
        if (newFacilityId !== oldFacilityId && newFacilityId) {
          navigateToSignIn();
        }
      });

      async function selectFacility(_facilityId) {
        // track this before the change
        const sameFacilityId = facilityId.value === _facilityId;
        await setFacilityId(_facilityId);
        // catches case where facility ID isn't changing relative to persisted option
        if (sameFacilityId) {
          navigateToSignIn();
        }
      }

      return { backTo, facilities, heading, selectFacility };
    },
    props: {
      // This component is interstitial and needs to know where to go when it's done, sign-up or
      // otherwise to sign-in
      signUpNext: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      facilityList() {
        if (this.signUpNext) {
          const partitionedFacilities = partition(
            this.facilities,
            f => f.dataset.learner_can_sign_up,
          );
          return {
            enabled: partitionedFacilities[0],
            disabled: partitionedFacilities[1],
          };
        } else {
          return { enabled: this.facilities, disabled: [] };
        }
      },
      label() {
        return this.signUpNext
          ? this.$tr('canSignUpForFacilityLabel')
          : this.$tr('selectFacilityLabel');
      },
    },
    $trs: {
      canSignUpForFacilityLabel: {
        message: 'Select the facility that you want to associate your new account with:',
        context: 'Displays if the user has been given access to multiple facilities. ',
      },
      askAdminForAccountLabel: {
        message: 'Ask your administrator to create an account for these facilities:',
        context:
          'This message will display if the user needs to ask an admin to get access to specific facilities.',
      },
      selectFacilityLabel: {
        message: 'Select the facility that has your account',
        context: 'Displays if the user has been given access to multiple facilities.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-select {
    text-align: left;
  }

  .disabled-facilities {
    margin-top: 40px;
  }

  .facility-name {
    margin-top: 12px;
  }

  .button {
    width: 100%;
    font-weight: normal;
    text-align: left;
    text-transform: none;
  }

  .label {
    // 12 margin from button beneath + 4 for 16px
    padding-bottom: 4px;
    font-size: 14px;
  }

  .facility-icon {
    margin-right: 16px;
  }

</style>

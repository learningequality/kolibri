<template>

  <AuthBase :hideCreateAccount="true">
    <div class="facility-select">
      <KRouterLink
        class="backlink"
        :to="backTo"
        :text="userString('goBackToHomeAction')"
        icon="back"
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
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { ComponentMap } from '../constants';
  import useAuthFlow from '../composables/useAuthFlow';
  import useAuthWatcher from '../composables/useAuthWatcher';
  import AuthBase from './AuthBase';
  import commonUserStrings from './commonUserStrings';

  export default {
    name: 'FacilitySelect',
    components: { AuthBase },
    mixins: [commonCoreStrings, commonUserStrings],
    setup(props) {
      const { facilities, facilityId, setFacilityId } = useAuthFlow();
      const { watchForFacilityChange } = useAuthWatcher();
      const router = useRouter();
      const route = useRoute();

      function navigateToWhereToNext() {
        const whereToNext = { ...props.whereToNext };
        if (route.query.next) {
          whereToNext.query.next = route.query.next;
        }
        router.push(whereToNext);
      }

      // facilityId is synchronized to local storage, so if multiple tabs change it, this should
      // keep the page in sync, also catches where facility ID is changing from persisted selection
      watchForFacilityChange((newFacilityId, oldFacilityId) => {
        if (newFacilityId !== oldFacilityId && newFacilityId) {
          navigateToWhereToNext();
        }
      });

      function selectFacility(_facilityId) {
        setFacilityId(_facilityId);
        // catches case where facility ID isn't changing relative to persisted option
        if (facilityId.value === _facilityId) {
          navigateToWhereToNext();
        }
      }

      return { facilities, selectFacility };
    },
    props: {
      // This component is interstitial and needs to know where to go when it's done
      // The type is Object, but it needs to be one of the listed routes in the validator
      whereToNext: {
        type: Object,
        required: true,
        validate(obj) {
          return [
            ComponentMap.PICTURE_SIGN_IN,
            ComponentMap.USERNAME_SIGN_IN,
            ComponentMap.SIGN_UP,
          ].includes(obj.name);
        },
      },
    },
    computed: {
      backTo() {
        return this.$router.getRoute(ComponentMap.AUTH_SELECT);
      },
      facilityList() {
        if (this.whereToNext.name === ComponentMap.SIGN_UP) {
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
        return this.whereToNext.name === ComponentMap.SIGN_UP
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

  .backlink {
    margin: 24px 0 16px;
  }

  .facility-icon {
    margin-right: 16px;
  }

</style>

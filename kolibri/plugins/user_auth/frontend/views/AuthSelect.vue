<template>

  <AuthBase :hideFacilityBasedOptions="true">
    <div class="auth-select">
      <div>
        <div class="label">
          {{ userString('signInPrompt') }}
        </div>
        <KRouterLink
          :text="coreString('signInLabel')"
          :to="signInRoute"
          appearance="raised-button"
          style="width: 100%"
          :primary="true"
        />
      </div>
      <div
        v-if="canSignUpWithAnyFacility"
        class="sign-up-prompt"
      >
        <div class="label">
          {{ $tr('newUserPrompt') }}
        </div>
        <KRouterLink
          :text="userString('createAccountAction')"
          :to="signUpRoute"
          :primary="false"
          style="width: 100%"
          appearance="raised-button"
        />
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import { computed } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useAuthFlow from '../composables/useAuthFlow';
  import useAuthRouter from '../composables/useAuthRouter';
  import AuthBase from './AuthBase';
  import commonUserStrings from './commonUserStrings';

  export default {
    name: 'AuthSelect',
    components: { AuthBase },
    mixins: [commonCoreStrings, commonUserStrings],
    setup() {
      const route = useRoute();
      const {
        getFacilitySelectionRoute,
        signInRoute: _signInRoute,
        signUpRoute: _signUpRoute,
      } = useAuthRouter(route);
      const { canSignUpWithAnyFacility, hasMultipleFacilities } = useAuthFlow();

      const signInRoute = computed(() => {
        return hasMultipleFacilities.value ? getFacilitySelectionRoute(false) : _signInRoute.value;
      });
      const signUpRoute = computed(() => {
        return hasMultipleFacilities.value ? getFacilitySelectionRoute(true) : _signUpRoute.value;
      });

      return {
        signInRoute,
        signUpRoute,
        canSignUpWithAnyFacility,
      };
    },
    $trs: {
      newUserPrompt: {
        message: 'Are you a new user?',
        context:
          'When a device has multiple facilities, the user is asked if they are a new user in association with a button that allows the user to create a new account',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .auth-select {
    font-size: 14px;
    text-align: left;

    .label {
      margin: 24px 0 16px;
    }
  }

</style>

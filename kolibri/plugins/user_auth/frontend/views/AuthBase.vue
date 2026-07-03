<template>

  <div class="fh">
    <div class="wrapper-table">
      <div class="main-row table-row">
        <div class="main-cell table-cell">
          <div
            class="box"
            :class="{
              landscape: showLandscapeLayout,
              shaking,
            }"
            :style="{ backgroundColor: $themeTokens.surface }"
          >
            <div
              :class="{
                'header-row': showLandscapeLayout,
              }"
            >
              <div v-if="showLandscapeLayout">
                <slot name="header-leading-actions"></slot>
              </div>
              <div
                :class="{
                  'header-title-row': showLandscapeLayout,
                }"
              >
                <CoreLogo
                  v-if="themeConfig.signIn.topLogo"
                  class="logo"
                  :src="themeConfig.signIn.topLogo.src"
                  :alt="themeConfig.signIn.topLogo.alt"
                  :style="themeConfig.signIn.topLogo.style"
                />
                <h1
                  v-if="themeConfig.signIn.showTitle"
                  class="kolibri-title"
                  :style="[{ color: $themeTokens.primary }, themeConfig.signIn.titleStyle]"
                >
                  {{ logoText }}
                </h1>
              </div>
            </div>

            <template v-if="!allowAccess">
              <!-- remote access disabled -->
              <p data-testid="restrictedAccess">
                {{ $tr('restrictedAccess') }}
              </p>
              <p>{{ $tr('restrictedAccessDescription') }}</p>
            </template>
            <DeviceUnusableMessage
              v-else-if="deviceUnusableReason"
              :reason="deviceUnusableReason"
            />
            <!-- Regular auth layout (remote access enabled) -->
            <template v-else>
              <p
                v-if="themeConfig.signIn.showPoweredBy"
                :style="themeConfig.signIn.poweredByStyle"
                class="small-text"
              >
                <KButton
                  v-if="oidcProviderFlow"
                  :text="$tr('poweredByKolibri')"
                  appearance="basic-link"
                  @click="whatsThisModalVisible = true"
                />
                <KExternalLink
                  v-else
                  :text="$tr('poweredByKolibri')"
                  :primary="true"
                  href="https://learningequality.org/r/powered_by_kolibri"
                  :openInNewTab="true"
                  appearance="basic-link"
                />
              </p>

              <slot></slot>

              <p
                v-if="showCreateAccountButton"
                class="create"
              >
                <KRouterLink
                  :text="userString('createAccountAction')"
                  :to="signUpRoute"
                  :primary="false"
                  appearance="raised-button"
                  :disabled="busy"
                  style="width: 100%"
                  data-testid="createUser"
                />
              </p>

              <div>
                <KExternalLink
                  v-for="item in loginItems"
                  :key="item.url"
                  :text="item.label"
                  :href="item.url"
                  :appearance="item.appearance"
                  style="width: 100%"
                >
                  <template #icon>
                    <img
                      :src="item.icon"
                      alt=""
                      width="24"
                      height="24"
                    >
                  </template>
                </KExternalLink>
              </div>
              <div
                :class="{
                  'footer-links-landscape': showLandscapeLayout,
                }"
              >
                <p
                  v-if="allowAlternateSignIn"
                  class="alternative-link small-text"
                  :style="{
                    borderColor: $themeTokens.text,
                  }"
                >
                  <KRouterLink
                    :text="alternateSignInText$()"
                    :to="alternateSignInRoute"
                    :primary="true"
                    appearance="basic-link"
                  />
                </p>
                <p
                  v-if="showGuestAccess"
                  class="alternative-link small-text"
                  :style="{
                    borderColor: $themeTokens.text,
                  }"
                >
                  <KExternalLink
                    :text="$tr('accessAsGuest')"
                    :href="guestURL"
                    :primary="true"
                    appearance="basic-link"
                  />
                </p>
              </div>
            </template>
          </div>
          <div
            class="background"
            :style="backgroundImageStyle"
            aria-hidden="true"
          ></div>
        </div>
      </div>
      <div class="table-row">
        <div
          class="footer-cell table-cell"
          :style="{ backgroundColor: $themeTokens.surface }"
        >
          <LanguageSwitcherFooter />
          <div class="small-text">
            <span class="version-string">
              {{ versionMsg }}
            </span>
            <CoreLogo
              v-if="themeConfig.signIn.showKolibriFooterLogo"
              class="footer-logo"
            />
            <span v-else> • </span>
            <KButton
              :text="coreString('usageAndPrivacyLabel')"
              appearance="basic-link"
              @click="privacyModalVisible = true"
            />
            <template v-if="themeConfig.signIn.backgroundImgCredit">
              <span> • </span>
              <span>
                {{
                  $tr('photoCreditLabel', {
                    photoCredit: themeConfig.signIn.backgroundImgCredit,
                  })
                }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      @submit="privacyModalVisible = false"
      @cancel="privacyModalVisible = false"
    />

    <KModal
      v-if="whatsThisModalVisible"
      :title="$tr('whatsThis')"
      :submitText="coreString('closeAction')"
      @submit="whatsThisModalVisible = false"
      @cancel="whatsThisModalVisible = false"
    >
      <p>{{ $tr('oidcGenericExplanation') }}</p>
      <p>
        <!-- eslint-disable vue/no-bare-strings-in-template -->
        <KExternalLink
          text="https://learningequality.org/kolibri"
          :primary="true"
          href="https://learningequality.org/r/powered_by_kolibri"
          :openInNewTab="true"
          appearance="basic-link"
        />
        <!-- eslint-enable vue/no-bare-strings-in-template -->
      </p>
    </KModal>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import CoreLogo from 'kolibri/components/CoreLogo';
  import PrivacyInfoModal from 'kolibri/components/PrivacyInfoModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import themeConfig from 'kolibri/styles/themeConfig';
  import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import urls from 'kolibri/urls';
  import plugin_data from 'kolibri-plugin-data';
  import useUser from 'kolibri/composables/useUser';
  import useAuthFlow from '../composables/useAuthFlow';
  import useAuthRouter from '../composables/useAuthRouter';
  import LanguageSwitcherFooter from './LanguageSwitcherFooter';
  import commonUserStrings from './commonUserStrings';
  import DeviceUnusableMessage from './DeviceUnusableMessage.vue';

  export default {
    name: 'AuthBase',
    components: { CoreLogo, LanguageSwitcherFooter, PrivacyInfoModal, DeviceUnusableMessage },
    mixins: [commonCoreStrings, commonUserStrings],
    setup(props) {
      const route = useRoute();
      const { nextParam, pictureSignInRoute, usernameSignInRoute, signUpRoute } =
        useAuthRouter(route);
      const { canSignUp, signInOptions, signInMethod } = useAuthFlow();
      const { isAppContext } = useUser();
      const { enterUsername$, enterPictures$ } = picturePasswordStrings;

      const allowAccess = computed(() => {
        return plugin_data.allowRemoteAccess || isAppContext.value;
      });
      const allowAlternateSignIn = computed(() => {
        return (
          !props.hideFacilityBasedOptions &&
          signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)
        );
      });
      const showPictureSignInOption = computed(() => {
        return signInMethod.value !== OptionsForSignIn.PICTURE_PASSWORD;
      });

      const showCreateAccountButton = computed(() => {
        return (
          !props.hideFacilityBasedOptions &&
          canSignUp.value &&
          (!allowAlternateSignIn.value || showPictureSignInOption.value)
        );
      });
      const alternateSignInText$ = computed(() => {
        return showPictureSignInOption.value ? enterPictures$ : enterUsername$;
      });
      const alternateSignInRoute = computed(() => {
        return showPictureSignInOption.value ? pictureSignInRoute.value : usernameSignInRoute.value;
      });

      const deviceUnusableReason = plugin_data.deviceUnusableReason;

      const showLandscapeLayout = computed(() => {
        // Prevent landscape layout from showing if the device is unusable or
        // remote access is disabled.
        return props.landscapeLayout && allowAccess.value && !deviceUnusableReason;
      });

      return {
        themeConfig,
        allowAccess,
        allowAlternateSignIn,
        showCreateAccountButton,
        alternateSignInRoute,
        deviceUnusableReason,
        showLandscapeLayout,
        signUpRoute,
        nextParam,
        // strings
        alternateSignInText$,
      };
    },
    props: {
      landscapeLayout: {
        type: Boolean,
        required: false,
        default: false,
      },
      hideFacilityBasedOptions: {
        type: Boolean,
        required: false,
        default: false,
      },
      busy: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        privacyModalVisible: false,
        whatsThisModalVisible: false,
        shaking: false,
      };
    },
    computed: {
      backgroundImageStyle() {
        if (this.themeConfig.signIn.background) {
          const scrimOpacity = this.themeConfig.signIn.scrimOpacity;
          return {
            backgroundColor: this.$themeTokens.primary,
            backgroundImage: `linear-gradient(rgba(0, 0, 0, ${scrimOpacity}), rgba(0, 0, 0, ${scrimOpacity})), url(${this.themeConfig.signIn.background})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            filter: 'blur(2px)',
          };
        }
        return { backgroundColor: this.$themeBrand.primary.v_400 };
      },
      guestURL() {
        return urls['kolibri:core:guest']();
      },
      loginItems() {
        return plugin_data.loginItems;
      },
      logoText() {
        return this.themeConfig.signIn.title
          ? this.themeConfig.signIn.title
          : this.coreString('kolibriLabel');
      },
      oidcProviderFlow() {
        return plugin_data.oidcProviderEnabled && this.nextParam;
      },
      showGuestAccess() {
        return plugin_data.allowGuestAccess && !this.oidcProviderFlow;
      },
      versionMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
    },
    beforeDestroy() {
      window.clearTimeout(this._shakeTimeout);
    },
    methods: {
      /**
       * Triggers shake animation and returns a Promise that resolves when complete.
       * Duration matches CSS animation: 800ms normally, 1ms with prefers-reduced-motion.
       * @public
       */
      shake() {
        this.shaking = true;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = prefersReducedMotion ? 1 : 800;

        return new Promise(resolve => {
          this._shakeTimeout = window.setTimeout(() => {
            this.shaking = false;
            resolve();
          }, duration);
        });
      },
    },
    $trs: {
      accessAsGuest: {
        message: 'Explore without account',
        context:
          'Link on sign in page which upon clicking allows user to access Kolibri as a guest user.',
      },
      oidcGenericExplanation: {
        message:
          'Kolibri is an e-learning platform. You can also use your Kolibri account to log in to some third-party applications.',
        context: 'Generic explanation about Kolibri.',
      },
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      oidcSpecificExplanation: {
        message:
          "You were sent here from the application '{app_name}'. Kolibri is an e-learning platform, and you can also use your Kolibri account to access '{app_name}'.",
        context:
          'Explanation of Kolibri that a user sees if they are sent to Kolibri from a different application.',
      },
      poweredBy: {
        message: 'Kolibri {version}',
        context:
          'Indicates the current version of Kolibri.\n\nFor languages with non-latin scripts, Kolibri should be transcribed phonetically into the target language, similar to a person\'s name. It should not be translated as "hummingbird".',
      },
      poweredByKolibri: {
        message: 'Powered by Kolibri',
        context: 'Indicates that Kolibri is the technology behind this application.',
      },
      whatsThis: {
        message: "What's this?",
        context: 'Link with explanation of the authentication process.',
      },
      restrictedAccess: {
        message: 'Access to Kolibri has been restricted for external devices',
        context: 'Error message description.',
      },
      restrictedAccessDescription: {
        message:
          'To change this, sign in as a super admin and update the Device network access settings',

        context: 'Error message description',
      },
      photoCreditLabel: {
        message: 'Photo credit: {photoCredit}',
        context: 'Gives credit to the photographer of the background image.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .fh {
    height: 100%;
  }

  .wrapper-table {
    display: table;
    width: 100%;
    height: 100%;
    text-align: center;
  }

  .table-row {
    position: relative;
    z-index: 1;
    display: table-row;
    // Do this to mitigate issues with just using z-index on Safari.
    transform: translateZ(1px);
  }

  .main-row {
    text-align: center;
  }

  .table-cell {
    display: table-cell;
  }

  .main-cell {
    height: 100%;
    vertical-align: middle;
  }

  .background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
  }

  .box {
    @extend %dropshadow-6dp;

    position: relative;
    z-index: 1;
    width: 360px;
    padding: 24px 32px;
    margin: 16px auto;
    border-radius: $radius;

    &.landscape {
      width: 70%;
      min-width: 360px;
      max-width: 1000px;
    }
  }

  .create {
    margin-top: 16px;
  }

  .alternative-link {
    margin-top: 20px;
    margin-bottom: 0;
  }

  .small-text {
    font-size: 0.8em;
  }

  .version-string {
    white-space: nowrap;
  }

  .footer-cell {
    @extend %dropshadow-6dp;

    padding: 16px;
  }

  .footer-cell .small-text {
    margin-top: 8px;
  }

  .suggestions-wrapper {
    position: relative;
    width: 100%;
  }

  .suggestions {
    @extend %dropshadow-1dp;

    position: absolute;
    z-index: 8;
    width: 100%;
    padding: 0;
    margin: 0;
    // Move up snug against the textbox
    margin-top: -2em;
    list-style-type: none;
  }

  .textbox-enter-active {
    transition: opacity 0.5s;
  }

  .textbox-enter {
    opacity: 0;
  }

  .list-leave-active {
    transition: opacity 0.1s;
  }

  .textbox-leave {
    transition: opacity 0s;
  }

  .kolibri-title {
    margin-top: 0;
    margin-bottom: 0;
  }

  .footer-logo {
    position: relative;
    top: -1px;
    display: inline-block;
    height: 24px;
    margin-right: 10px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .footer-links-landscape {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    p {
      padding: 0 16px;
      border-right: 1px solid;

      &:last-child {
        border-right: 0;
      }
    }
  }

  .header-title-row {
    display: flex;
    flex-direction: row-reverse;
    gap: 8px;
    align-items: center;
  }

  .header-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  /deep/ .ui-textbox-input {
    &:hover {
      outline: none;
    }
  }

  .shaking {
    animation: shake 0.8s ease-in-out both;
  }

  @keyframes shake {
    10%,
    90% {
      transform: translate3d(-1px, 0, 0);
    }

    20%,
    80% {
      transform: translate3d(2px, 0, 0);
    }

    30%,
    50%,
    70% {
      transform: translate3d(-4px, 0, 0);
    }

    40%,
    60% {
      transform: translate3d(4px, 0, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shaking {
      animation-duration: 1ms;
    }
  }

</style>

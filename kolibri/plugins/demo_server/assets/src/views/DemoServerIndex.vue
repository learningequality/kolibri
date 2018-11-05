<template>

  <div
    class="banner"
    :tabindex="0"
    role="dialog"
  >
    <div class="banner-inner">
      <div v-if="!bannerClosed">
        <h1>Welcome to the Kolibri demo site!</h1>

        <p>
          You are welcome to explore with any of the
          three primary user types (login credentials are in parentheses):
        </p>
        <ul>
          <li>Learner (learnerdemo/pass or access as a guest)</li>
          <li>Coach (coachdemo/pass)</li>
          <li>Admin (admindemo/pass)</li>
        </ul>

        <p>
          This online demo site includes the features and functionalities of the latest version,
          but only holds a sample of the content that has been made available for offline use
          in Kolibri.
          It is intended for demonstration purposes and any user data on here may be cleared
          periodically.
        </p>

        <p>
          To learn more about using Kolibri, take a look at our
          <a href="https://learningequality.org/documentation/">
            documentation guides
          </a> and
          <a href="https://learningequality.org/download/">
            download the latest release
          </a> to better understand the platform in an offline context.
        </p>
      </div>
      <div v-else>
        <h1 class="closed-text">Welcome to the Kolibri demo site!</h1>
      </div>
      <KButton
        class="close-button"
        :text="bannerClosed ? 'Open' : 'Close'"
        appearance="flat-button"
        :primary="true"
        @click="bannerClosed = !bannerClosed"
      />

    </div>
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';

  export default {
    name: 'DemoServerIndex',
    components: {
      KButton,
    },
    data() {
      return {
        bannerClosed: false,
      };
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .banner {
    position: absolute;
    top: 0%;
    left: 0%;
    width: 100%;
    margin: 0 auto;
    overflow-y: auto;
    background: $core-bg-light;
    border-radius: $radius;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  }

  .banner-inner {
    max-width: 1000px;
    padding-top: 24px;
    padding-right: 12px;
    padding-left: 12px;
    margin: 0 auto;
    h1 {
      font-size: 14px;
      font-weight: bold;
    }
  }

  .close-button {
    float: right;
    margin-bottom: 24px;
  }

  .closed-text {
    float: left;
  }

</style>

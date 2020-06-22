<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="removeNavIcon"
      @click_back="goToLastStep"
    />
    <div class="main">
      <KPageContainer>
        <router-view @click_next="goToNextStep" />
      </KPageContainer>
    </div>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import commonSetupElements from '../../../commonSetupElements';
  import ProgressToolbar from './ProgressToolbar';

  const PagePairs = [
    // [current page, next page(s)]
    ['DEFAULT_LANGUAGE', 'GETTING_STARTED'],
    ['GETTING_STARTED', 'DEVICE_NAME'],
    ['DEVICE_NAME', 'PUBLIC_SETUP_METHOD'],
  ];

  const getFromPair = (name, pos) => {
    const match = find(PagePairs, { [pos]: name });
    return match ? match[pos === 0 ? 1 : 0] : 'DEFAULT_LANGUAGE';
  };

  // Template that places simplified UIBar at the top
  // and manages the non-linear flow of steps for these forms
  export default {
    name: 'UngroupedSetupSteps',
    components: {
      ProgressToolbar,
    },
    mixins: [commonSetupElements],
    computed: {
      removeNavIcon() {
        return this.$route.name === 'DEFAULT_LANGUAGE';
      },
    },
    methods: {
      goToNextStep() {
        if (this.$route.name === 'DEFAULT_LANGUAGE') {
          this.$store.commit('START_SETUP');
        }
        const name = getFromPair(this.$route.name, 0);
        this.$router.push({ name });
      },
      goToLastStep() {
        const name = getFromPair(this.$route.name, 1);
        this.$router.push({ name });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .main {
    margin: 16px;
  }

</style>

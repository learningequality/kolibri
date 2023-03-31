<template>

  <router-link
    :to="exploreLibraries"
    class="card-main-wrapper"
  >
    <div class="cards" style="height:270px;">
      <div>
        <div class="card-title">
          <h1>
            {{ coreString('explore') }}
          </h1>
        </div>
      </div>
    </div>
  </router-link>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from './../../constants';

  export default {
    name: 'ExploreCard',
    mixins: [commonCoreStrings],
    computed: {
      exploreLibraries() {
        return { name: PageNames.EXPLORE_LIBRARIES };
      },
    },
    created() {},
    methods: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  $margin: 16px;

  .card-main-wrapper {
    @extend %dropshadow-1dp;

    position: relative;
    display: inline-block;
    width: 100%;
    max-height: 270px;
    padding-bottom: $margin;
    text-decoration: none;
    vertical-align: top;
    border-radius: $radius;
    transition: box-shadow $core-time ease;

    &:hover {
      @extend %dropshadow-8dp;
    }

    &:focus {
      outline-width: 4px;
      outline-offset: 6px;
    }
  }

  .cards {
    margin: auto;
    text-align: center;
  }
  
  .card-title {
    margin: auto;
    margin-top: 100px;
    letter-spacing: normal;
  }

</style>
<template>

  <div>

    <!-- linking the entire details section to a "view more" page -->
    <router-link v-if="showViewMore" :to="viewMorePageLink">
      <div class="card-group-details">
        <header v-if="header" >
          <h1 class="card-group-details-header">
            {{ header }}
          </h1>
        </header>
        <span class="card-group-details-view-more">
          {{ $tr('viewMoreFromSectionButton') }}
        </span>
      </div>
    </router-link>

    <!-- relying on vue to not have to re-render all of this -->
    <header class="card-group-details">
      <h1 v-if="header" class="card-group-details-header">
        {{header}}
      </h1>
    </header>

  </template>

</div>


<script>

  export default {
    name: 'contentCardGroupHeader',
    $trs: {
      viewMoreFromSectionButton: 'View more'
    }
    components: { progressIcon },
    props: {
      header: { type: String },
      viewMorePageLink: { type: Object },
      showViewMore: { type: Boolean },
    },
  };

</script>


<style lang="stylus" scoped>

  .card-group-details
    // vertical-align: bottom
    // text-align: justify
    width: 100%
    clearfix()
    position: relative
    margin-bottom: 1em

    &-header
      float: left
      text-decoration: none
      color: $core-text-default

    &-view-more
      position: absolute
      right: 0
      bottom: 0

    &-link-icon
      // puts drops the center angle of the arrow to about the level of text's midline
      transform: translateY(30%)
      display: inline

      ../-header &
        $header-size = 1.5em
        height: $header-size
        width: $header-size
      ../-view-more &
        $view-more-size = 1.3em
        height: $view-more-size
        width: $view-more-size


</style>

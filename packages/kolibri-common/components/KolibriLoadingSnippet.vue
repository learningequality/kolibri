<template>

  <div class="container">
    <div class="rel">
      <div class="flapping-kolibri">
        <KLogo
          size="250"
          :animate="true"
          :altText="$tr('kolibriLoading')"
        />
      </div>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'KolibriLoadingSnippet',
    $trs: {
      kolibriLoading: {
        message: 'Kolibri loading',
        context: 'Indicates Kolibri is loading',
      },
    },
  };

</script>


<style>

  .rel {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .flapping-kolibri {
    /* Set the width of this to match the size prop to center it */
    width: 250px;
    margin: 0 auto;
    animation: fadeIn;
    animation-duration: 1s;
    animation-delay: 1s;
    animation-fill-mode: both;
  }

</style>

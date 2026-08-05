<template>

  <!--
    Rendered indirectly: MatchInteraction reads the two sets out of its slot to
    tell sources from targets, so this component is not mounted on its own. It
    still has to be a registered component, or DOMPurify drops the element and
    the choices inside it along with it.
  -->
  <div class="qti-simple-match-set"><slot></slot></div>

</template>


<script>

  export default {
    name: 'SimpleMatchSet',
    tag: 'qti-simple-match-set',
    setup() {
      return {};
    },
  };

</script>

<template>

  <div>
    <h1>Section Editor</h1>
    <h2>
      <KRouterLink appearance="raised-button" :to="{ path: 'select-resources' }">
        Select resources
      </KRouterLink>
    </h2>
  </div>

</template>


<script>

  export default {
    name: 'SectionEditor',
  };

</script>

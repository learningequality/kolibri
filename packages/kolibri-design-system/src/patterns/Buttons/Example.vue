<template>

  <div>
    <p>
      <KButton text="button" appearance="basic-link" /> |
      <KRouterLink text="router link" :to="{}" /> |
      <KExternalLink text="external link" href="#" />
    </p>
    <p>
      <KButton text="button" appearance="flat-button" />
      <KRouterLink text="router link" :to="{}" appearance="flat-button" />
      <KExternalLink text="external link" href="#" appearance="flat-button" />
    </p>
    <p>
      <KButton text="button" :primary="true" appearance="flat-button" />
      <KRouterLink text="router link" :to="{}" :primary="true" appearance="flat-button" />
      <KExternalLink text="external link" href="#" :primary="true" appearance="flat-button" />
    </p>
    <p>
      <KButton text="button" :primary="true" />
      <KRouterLink text="router link" :to="{}" :primary="true" appearance="raised-button" />
      <KExternalLink text="external link" href="#" :primary="true" appearance="raised-button" />
    </p>
    <p>
      <KButton text="button" />
      <KRouterLink text="router link" :to="{}" appearance="raised-button" />
      <KExternalLink text="external link" href="#" appearance="raised-button" />
    </p>
    <p>
      <KButton text="disabled button" :primary="true" :disabled="true" />
      <KButton text="disabled button" appearance="flat-button" :primary="true" :disabled="true" />
    </p>
    <p>
      <KButton text="disabled button" :disabled="true" />
      <KButton text="disabled button" appearance="flat-button" :disabled="true" />
    </p>
  </div>

</template>


<script>

  export default {
    name: 'Example',
  };

</script>

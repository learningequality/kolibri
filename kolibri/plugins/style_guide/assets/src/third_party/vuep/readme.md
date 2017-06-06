# Overview

A component for rendering Vue components with live editor and preview.

# Source

[https://github.com/QingWei-Li/vuep/releases/tag/v0.7.0](https://github.com/QingWei-Li/vuep/releases/tag/v0.7.0)

# Warning

Vuep isn't webpack-importable (via the default loader or the `imports-loader`),
so the following code has been added to line 9572 to make it so.

```javascript
module.exports = Vuep$1;
```

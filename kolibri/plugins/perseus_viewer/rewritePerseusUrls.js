// Simple webpack loader that rewrites KA CDN font URLs to local paths.
// Perseus CSS references fonts from cdn.kastatic.org which won't work
// offline. We serve these fonts locally instead.
module.exports = function(source) {
  return source.replace(
    'https://cdn.kastatic.org/fonts/mathjax/MathJax_Main-Regular.woff',
    '~mathjax-fonts/MathJax_Main-Regular.woff',
  );
};

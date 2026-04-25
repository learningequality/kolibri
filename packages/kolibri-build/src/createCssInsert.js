/**
 * Generate a CSS insert function for MiniCssExtractPlugin that tags
 * link elements with their bundle ID for RTL CSS management.
 * @param {string} bundleId - The webpack bundle identifier.
 * @returns {Function} Insert function that tags links and appends to head.
 */
function createCssInsert(bundleId) {
  // MiniCssExtractPlugin serializes functions with .toString(), losing closures.
  // Use new Function to bake the bundleId into the function's source code.
  return new Function(
    'linkTag',
    `linkTag.setAttribute("data-webpack-bundle", ${JSON.stringify(bundleId)});
    document.head.appendChild(linkTag);`,
  );
}

module.exports = { createCssInsert };

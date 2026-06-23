// Shim for react-router-dom-v5-compat used by Wonder Blocks components.
//
// Wonder Blocks (clickable, button, link, etc.) imports useInRouterContext,
// useNavigate, and Link from this package. It checks useInRouterContext()
// first — when false, components fall back to plain <a> tags and standard
// navigation.
//
// The real react-router-dom-v5-compat@6.x re-exports from react-router@6,
// but Kolibri's Perseus plugin only has react-router@5 which lacks these
// APIs. Rather than pulling in all of react-router@6, we provide stubs
// that tell Wonder Blocks "no router context exists."
import React from 'react';

export const useInRouterContext = function useInRouterContext() {
  return false;
};

export const useNavigate = function useNavigate() {
  return function () {};
};

export const Link = React.forwardRef(function ShimLink(props, ref) {
  return React.createElement('a', Object.assign({}, props, { ref: ref }));
});

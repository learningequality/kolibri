/**
 * Minimal stack-trace parser producing Sentry-compatible stack frames, so the
 * telemetry server can re-report frontend errors into Sentry without parsing
 * the raw stack itself. Handles the common V8 (Chrome/Edge) and
 * SpiderMonkey/JavaScriptCore (Firefox/Safari) stack formats.
 *
 * Frames are returned oldest-first (the throwing frame last), matching the
 * order Sentry expects and the backend's get_stack_frames.
 */

// Bundles are minified, so an anonymous frame is the norm rather than a sign
// of a problem; Sentry uses "?" for an unknown function name.
const ANONYMOUS_FUNCTION = '?';

const ORIGIN = typeof window !== 'undefined' && window.location ? window.location.origin : '';

function buildFrame(absPath, fn, lineno, colno) {
  // Same-origin frames are our own application code; cross-origin ones (CDN
  // libraries, browser extensions) are not. The server can refine this, but
  // marking it here keeps the frame Sentry-shaped.
  const inApp = !absPath || absPath.startsWith(ORIGIN) || absPath.startsWith('/');
  return {
    filename: absPath,
    abs_path: absPath,
    function: fn || ANONYMOUS_FUNCTION,
    lineno: lineno ? parseInt(lineno, 10) : null,
    colno: colno ? parseInt(colno, 10) : null,
    in_app: inApp,
  };
}

function parseLine(line) {
  let match;

  // V8: "at func (url:line:col)", including "at new C (...)" and
  // "at async f (...)" wrappers around the function name.
  match = line.match(/^\s*at (?:async )?(?:new )?(.+?) \((.+?):(\d+):(\d+)\)\s*$/);
  if (match) {
    return buildFrame(match[2], match[1], match[3], match[4]);
  }

  // V8 without a function name: "at url:line:col" (also "at async url:...").
  match = line.match(/^\s*at (?:async )?(.+?):(\d+):(\d+)\s*$/);
  if (match) {
    return buildFrame(match[1], ANONYMOUS_FUNCTION, match[2], match[3]);
  }

  // Firefox/Safari: "func@url:line:col" or "@url:line:col".
  match = line.match(/^(.*?)@(.+?):(\d+):(\d+)\s*$/);
  if (match) {
    return buildFrame(match[2], match[1], match[3], match[4]);
  }

  return null;
}

/**
 * Parse an Error.stack string into an array of Sentry-shaped stack frames.
 * Lines that do not match a known format (e.g. the leading error message) are
 * skipped. Returns an empty array for a missing or unparseable stack.
 */
export default function parseStackFrames(stack) {
  if (!stack || typeof stack !== 'string') {
    return [];
  }
  const frames = [];
  for (const line of stack.split('\n')) {
    const frame = parseLine(line);
    if (frame) {
      frames.push(frame);
    }
  }
  // Stacks are newest-first; Sentry expects oldest-first.
  return frames.reverse();
}

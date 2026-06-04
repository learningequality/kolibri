import parseStackFrames from '../stackFrames';

describe('parseStackFrames', () => {
  it('returns an empty array for a missing or non-string stack', () => {
    expect(parseStackFrames(undefined)).toEqual([]);
    expect(parseStackFrames(null)).toEqual([]);
    expect(parseStackFrames(42)).toEqual([]);
  });

  it('parses a V8 (Chrome) stack, oldest frame last', () => {
    const stack = [
      'TypeError: boom',
      '    at inner (https://host/static/app.js:10:5)',
      '    at outer (https://host/static/app.js:20:9)',
    ].join('\n');

    const frames = parseStackFrames(stack);

    expect(frames).toEqual([
      {
        filename: 'https://host/static/app.js',
        abs_path: 'https://host/static/app.js',
        function: 'outer',
        lineno: 20,
        colno: 9,
        in_app: false,
      },
      {
        filename: 'https://host/static/app.js',
        abs_path: 'https://host/static/app.js',
        function: 'inner',
        lineno: 10,
        colno: 5,
        in_app: false,
      },
    ]);
  });

  it('parses V8 frames without a function name', () => {
    const stack = 'Error: x\n    at https://host/static/app.js:1:2';

    const frames = parseStackFrames(stack);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      function: '?',
      filename: 'https://host/static/app.js',
      lineno: 1,
      colno: 2,
    });
  });

  it('parses a Firefox/Safari stack', () => {
    const stack = ['inner@https://host/app.js:10:5', 'outer@https://host/app.js:20:9'].join('\n');

    const frames = parseStackFrames(stack);

    expect(frames).toHaveLength(2);
    // Oldest first.
    expect(frames[0]).toMatchObject({ function: 'outer', lineno: 20, colno: 9 });
    expect(frames[1]).toMatchObject({ function: 'inner', lineno: 10, colno: 5 });
  });

  it('handles anonymous Firefox frames', () => {
    const frames = parseStackFrames('@https://host/app.js:5:1');

    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ function: '?', lineno: 5, colno: 1 });
  });

  it('skips lines that are not stack frames', () => {
    const stack = 'Some error message with no frames\nnot a frame either';

    expect(parseStackFrames(stack)).toEqual([]);
  });

  it('marks same-origin frames as in_app', () => {
    // jsdom serves the suite from http://localhost; a same-origin frame is
    // application code.
    const frames = parseStackFrames(
      `Error\n    at f (${window.location.origin}/static/app.js:1:1)`,
    );

    expect(frames[0].in_app).toBe(true);
  });
});

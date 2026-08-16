import { createZipBytes } from 'kolibri-zip';

/**
 * Mixed QTI packages in the shape learningequality/studio#6047 publishes. Each
 * item JSON is stored verbatim from the source channel, so its image refs keep
 * the raw `${☣ LOCALPATH}/images/…` form while the package declares the same
 * assets under `perseus/images/…`.
 *
 * Provenance — Kolibri QA Channel 95a52b386f2c485cb97dd60901674a98 on
 * https://kolibri-dev.learningequality.org (import token `nakav-mafak`):
 * - perseus-square-shape: assessment item 3da39cc6… of "Nombra figuras
 *   (parte 1)" (node 3c2c0889…) — a plain PNG plus a graded radio.
 * - perseus-classify-triangle: assessment item e1ad6a6b… of "Practice quiz -
 *   Classify triangles by both sides and angles" (node b539fe66…) — a
 *   `web+graphie:` background image plus a graded multi-select radio.
 */

function perseusWrapperXml(perseusPath) {
  return `
  <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="perseus-wrapper" title="Perseus (mixed QTI)" adaptive="false" time-dependent="false">
    <qti-response-declaration identifier="RESPONSE" cardinality="record" />
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
      <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-item-body>
      <qti-custom-interaction response-identifier="RESPONSE" data-type="perseus" data-perseus-path="${perseusPath}" />
    </qti-item-body>
    <qti-response-processing>
      <qti-response-condition>
        <qti-response-if>
          <qti-field-value field-identifier="correct">
            <qti-variable identifier="RESPONSE" />
          </qti-field-value>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">1</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-if>
        <qti-response-else>
          <qti-set-outcome-value identifier="SCORE">
            <qti-base-value base-type="float">0</qti-base-value>
          </qti-set-outcome-value>
        </qti-response-else>
      </qti-response-condition>
    </qti-response-processing>
  </qti-assessment-item>`;
}

function perseusFixture(perseusPath, files) {
  return { perseusPath, xml: perseusWrapperXml(perseusPath), files };
}

const perseusFixtures = {
  'perseus-square-shape': perseusFixture('perseus/3da39cc6fbe15074b24dea16a0662cd6.json', {
    'perseus/3da39cc6fbe15074b24dea16a0662cd6.json':
      '{"answerArea":{"calculator":false,"options":{"content":"","images":{},"widgets":{}},"type":"multiple"},"hints":[{"content":"La figura tiene $4$ lados de igual longitud.\\n\\nLa figura tiene esquinas cuadradas, como una hoja de papel.","images":{},"widgets":{}},{"content":"![](${☣ LOCALPATH}/images/d5ba1448bb14ba1b5699e540cf789142.png) es un cuadrado.","images":{"${☣ LOCALPATH}/images/d5ba1448bb14ba1b5699e540cf789142.png":{"height":45,"width":45}},"widgets":{}}],"itemDataVersion":{"major":0,"minor":1},"question":{"content":"**¿Qué es esta figura?**\\n\\n![](${☣ LOCALPATH}/images/d5ba1448bb14ba1b5699e540cf789142.png)\\n\\n[[☃ radio 1]] ","images":{"${☣ LOCALPATH}/images/d5ba1448bb14ba1b5699e540cf789142.png":{"height":45,"width":45}},"widgets":{"radio 1":{"graded":true,"options":{"choices":[{"clue":"Los círculos son redondos.  Esta figura tiene $4$ lados rectos.","content":"Círculo","correct":false},{"clue":"Los triángulos tienen $3$ lados.  Esta figura tiene $4$ lados rectos.","content":"Triángulo","correct":false},{"clue":"¡Sí!  Los cuadrados tienen $4$ lados de igual longitud.","content":"Cuadrado","correct":true}],"displayCount":null,"multipleSelect":false,"noneOfTheAbove":false,"onePerLine":true,"randomize":true},"type":"radio","version":{"major":0,"minor":0}}}}}\n',
    'perseus/images/d5ba1448bb14ba1b5699e540cf789142.png':
      'data:image/png;base64,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',
  }),
  'perseus-classify-triangle': perseusFixture('perseus/e1ad6a6bd16456f1b328071496ec2be6.json', {
    'perseus/e1ad6a6bd16456f1b328071496ec2be6.json':
      '{"answerArea":{"calculator":false,"chi2Table":false,"periodicTable":false,"tTable":false,"zTable":false},"hints":[{"content":"We can classify triangles by their sides and their angles.","images":{},"replace":false,"widgets":{}},{"content":"###Sides\\n\\nAn $\\\\blueD{\\\\text{equilateral}}$ triangle has  $\\\\blueD{3\\\\text{ equal sides}}$. \\n\\nAn  $\\\\purpleC{\\\\text{isosceles}}$  triangle has _at least_ $\\\\purpleC{2\\\\text{ equal sides}}$.\\n\\nA  $\\\\greenD{\\\\text{scalene}}$ triangle has $\\\\greenD{0\\\\text{ equal sides}}$.","images":{},"replace":false,"widgets":{}},{"content":"**How many sides of equal length does $\\\\triangle{ABC}$ have?**\\n\\n$\\\\triangle{ABC}$ has $\\\\greenD{0\\\\text{ equal sides}}$, so it is a $\\\\greenD{\\\\text{scalene}}$ triangle.","images":{},"replace":false,"widgets":{}},{"content":"###Angles\\n\\nAn $\\\\goldE{\\\\text{acute}}$ triangle has  $\\\\goldE{3}$ angles that measure $\\\\goldE{\\\\text{less than } 90^\\\\circ}$. \\n\\nA  $\\\\tealD{\\\\text{right}}$  triangle has  $\\\\tealD{1}$ angle that measures $\\\\tealD{90^\\\\circ}$.\\n\\nAn $\\\\maroonD{\\\\text{obtuse}}$ triangle has  $\\\\maroonD{1}$  angle that measures $\\\\maroonD{\\\\text{more than } 90^\\\\circ}$. ","images":{},"replace":false,"widgets":{}},{"content":"**What are the measures of $\\\\triangle{ABC}$\'s angles?**\\n\\n\\n[[☃ image 1]]\\n\\n$\\\\triangle{ABC}$ has $\\\\maroonD{1}$  angle that measures $\\\\maroonD{\\\\text{more than } 90^\\\\circ}$so it is an $\\\\maroonD{\\\\text{obtuse}}$ triangle.","images":{},"replace":false,"widgets":{"image 1":{"alignment":"block","graded":true,"options":{"alt":"A triangle ABC with side lengths of 4 millimeters, 7 millimeters, and 5 millimeters and angle measures of 42 degrees, 104 degrees, and 34 degrees. ","backgroundImage":{"height":210,"url":"web+graphie:${☣ LOCALPATH}/images/b2472d6d9e60f7b7abe54be369595f503015ffe5","width":300},"box":[300,210],"caption":"","labels":[],"range":[[0,10],[0,10]],"static":false,"title":""},"static":false,"type":"image","version":{"major":0,"minor":0}}}},{"content":"$\\\\triangle{ABC}$ is a $\\\\greenD{\\\\text{scalene}}$ triangle and an  $\\\\maroonD{\\\\text{obtuse}}$ triangle.","images":{},"replace":false,"widgets":{}}],"itemDataVersion":{"major":0,"minor":1},"question":{"content":"**Classify $\\\\triangle{ABC}$ by its side lengths and by its angles.**\\n\\n[[☃ image 1]]\\n\\n \\n\\n[[☃ radio 1]]\\n\\n","images":{},"widgets":{"image 1":{"alignment":"block","graded":true,"options":{"alt":"A triangle ABC with side lengths of 4 millimeters, 7 millimeters, and 5 millimeters. There is 1 obtuse angle and 2 acute angles.","backgroundImage":{"height":210,"url":"web+graphie:${☣ LOCALPATH}/images/3a88adb9d69b2f455686069c6b178b22ac11f963","width":300},"box":[300,210],"caption":"","labels":[],"range":[[0,10],[0,10]],"static":false,"title":""},"static":false,"type":"image","version":{"major":0,"minor":0}},"radio 1":{"alignment":"default","graded":true,"options":{"choices":[{"content":"Right triangle"},{"content":"Acute triangle"},{"content":"Equilateral triangle","isNoneOfTheAbove":false},{"content":"Scalene triangle","correct":true,"isNoneOfTheAbove":false},{"content":"Obtuse triangle","correct":true,"isNoneOfTheAbove":false},{"content":"Isosceles triangle","isNoneOfTheAbove":false}],"countChoices":true,"deselectEnabled":false,"displayCount":null,"hasNoneOfTheAbove":false,"multipleSelect":true,"randomize":true},"static":false,"type":"radio","version":{"major":1,"minor":0}}}}}\n',
    'perseus/images/3a88adb9d69b2f455686069c6b178b22ac11f963.svg':
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjEwIiB2aWV3Qm94PSIwIDAgMzAwIDIxMCI+PGVsbGlwc2UgY3g9IjYwIiBjeT0iMzAiIHJ4PSI0IiByeT0iNCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjAiLz48ZWxsaXBzZSBjeD0iOTAiIGN5PSIxNTAiIHJ4PSI0IiByeT0iNCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjAiLz48ZWxsaXBzZSBjeD0iMjQwIiBjeT0iMTUwIiByeD0iNCIgcnk9IjQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSIwIi8+PHBhdGggc3Ryb2tlPSIjMDAwIiBkPSJNNjAgMzBsMzAgMTIwaDE1MHoiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iMCIgZmlsbD0ibm9uZSIvPjwvc3ZnPgo=',
    'perseus/images/3a88adb9d69b2f455686069c6b178b22ac11f963-data.json':
      'data:application/json;base64,c3ZnRGF0YTNhODhhZGI5ZDY5YjJmNDU1Njg2MDY5YzZiMTc4YjIyYWMxMWY5NjMoeyJyYW5nZSI6W1stMiw4XSxbLTEsNl1dLCJsYWJlbHMiOlt7ImNvbnRlbnQiOiI0XFx0ZXh0eyBtbSB9IiwiY29vcmRpbmF0ZXMiOlstMC4xNDY3NjE2NjY3NjM1NTQ3MywyLjgzODMwOTU4MzMwOTExMTRdLCJhbGlnbm1lbnQiOiJjZW50ZXIiLCJ0eXBlc2V0QXNNYXRoIjp0cnVlLCJzdHlsZSI6eyJmaWxsLW9wYWNpdHkiOiIwIiwiY29sb3IiOiJibGFjayJ9fSx7ImNvbnRlbnQiOiI1XFx0ZXh0eyBtbX0iLCJjb29yZGluYXRlcyI6WzMuNSwwLjMzMzMzMzMzMzMzMzMzMzA0XSwiYWxpZ25tZW50IjoiY2VudGVyIiwidHlwZXNldEFzTWF0aCI6dHJ1ZSwic3R5bGUiOnsiZmlsbC1vcGFjaXR5IjoiMCIsImNvbG9yIjoiYmxhY2sifX0seyJjb250ZW50IjoiN1xcdGV4dHsgbW19IiwiY29vcmRpbmF0ZXMiOlszLjM2OTgwMDEzMDgxNjgxOTMsMy41NTQ3MDAxOTYyMjUyMjldLCJhbGlnbm1lbnQiOiJjZW50ZXIiLCJ0eXBlc2V0QXNNYXRoIjp0cnVlLCJzdHlsZSI6eyJmaWxsLW9wYWNpdHkiOiIwIiwiY29sb3IiOiJibGFjayJ9fSx7ImNvbnRlbnQiOiJBIiwiY29vcmRpbmF0ZXMiOlstMC40MTA0MzQxNDI2MTUxNjg3NSw1LjU4MjQwODA2MzgxNzExOV0sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IkIiLCJjb29yZGluYXRlcyI6WzAuNTYxNDQ2OTA3MTI5MTcxNCwwLjQzODMxMTU0NTY5NTM1ODhdLCJhbGlnbm1lbnQiOiJjZW50ZXIiLCJ0eXBlc2V0QXNNYXRoIjp0cnVlLCJzdHlsZSI6eyJmaWxsLW9wYWNpdHkiOiIwIiwiY29sb3IiOiJibGFjayJ9fSx7ImNvbnRlbnQiOiJDIiwiY29vcmRpbmF0ZXMiOls2LjY4MTkyNDA4MzQzOTg4MywwLjc5MzUzMDAwMDc1MTY4MzddLCJhbGlnbm1lbnQiOiJjZW50ZXIiLCJ0eXBlc2V0QXNNYXRoIjp0cnVlLCJzdHlsZSI6eyJmaWxsLW9wYWNpdHkiOiIwIiwiY29sb3IiOiJibGFjayJ9fV19KTs=',
    'perseus/images/b2472d6d9e60f7b7abe54be369595f503015ffe5.svg':
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjEwIiB2aWV3Qm94PSIwIDAgMzAwIDIxMCI+PGVsbGlwc2UgY3g9IjYwIiBjeT0iMzAiIHJ4PSI0IiByeT0iNCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjAiLz48ZWxsaXBzZSBjeD0iOTAiIGN5PSIxNTAiIHJ4PSI0IiByeT0iNCIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjAiLz48ZWxsaXBzZSBjeD0iMjQwIiBjeT0iMTUwIiByeD0iNCIgcnk9IjQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSIwIi8+PHBhdGggc3Ryb2tlPSIjMDAwIiBkPSJNNjAgMzBsMzAgMTIwaDE1MHoiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iMCIgZmlsbD0ibm9uZSIvPjwvc3ZnPgo=',
    'perseus/images/b2472d6d9e60f7b7abe54be369595f503015ffe5-data.json':
      'data:application/json;base64,c3ZnRGF0YWIyNDcyZDZkOWU2MGY3YjdhYmU1NGJlMzY5NTk1ZjUwMzAxNWZmZTUoeyJyYW5nZSI6W1stMiw4XSxbLTEsNl1dLCJsYWJlbHMiOlt7ImNvbnRlbnQiOiJcXG1hcm9vbkR7NDJeXFxjaXJjfSIsImNvb3JkaW5hdGVzIjpbMC43MzczODM0ODg2MzQxNjQ2LDMuOTUzNjQ5MjA4Njg5NzIzN10sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IlxcbWFyb29uRHsxMDReXFxjaXJjfSIsImNvb3JkaW5hdGVzIjpbMS41NjUyNTIwNDg0NDgyMjczLDEuNzIzOTYxNDg3MzI0MjU0OF0sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IlxcbWFyb29uRHszNF5cXGNpcmN9IiwiY29vcmRpbmF0ZXMiOls0LjYyODc0NzA0MTQ5MjI5MiwxLjQxNTE4MTk4OTAwNDA1Nl0sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IjRcXHRleHR7IG1tIH0iLCJjb29yZGluYXRlcyI6Wy0wLjE0Njc2MTY2Njc2MzU1NDczLDIuODM4MzA5NTgzMzA5MTExNF0sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IjVcXHRleHR7IG1tfSIsImNvb3JkaW5hdGVzIjpbMy41LDAuMzMzMzMzMzMzMzMzMzMzMDRdLCJhbGlnbm1lbnQiOiJjZW50ZXIiLCJ0eXBlc2V0QXNNYXRoIjp0cnVlLCJzdHlsZSI6eyJmaWxsLW9wYWNpdHkiOiIwIiwiY29sb3IiOiJibGFjayJ9fSx7ImNvbnRlbnQiOiI3XFx0ZXh0eyBtbX0iLCJjb29yZGluYXRlcyI6WzMuMzY5ODAwMTMwODE2ODE5MywzLjU1NDcwMDE5NjIyNTIyOV0sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IkEiLCJjb29yZGluYXRlcyI6Wy0wLjQxMDQzNDE0MjYxNTE2ODc1LDUuNTgyNDA4MDYzODE3MTE5XSwiYWxpZ25tZW50IjoiY2VudGVyIiwidHlwZXNldEFzTWF0aCI6dHJ1ZSwic3R5bGUiOnsiZmlsbC1vcGFjaXR5IjoiMCIsImNvbG9yIjoiYmxhY2sifX0seyJjb250ZW50IjoiQiIsImNvb3JkaW5hdGVzIjpbMC41NjE0NDY5MDcxMjkxNzE0LDAuNDM4MzExNTQ1Njk1MzU4OF0sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19LHsiY29udGVudCI6IkMiLCJjb29yZGluYXRlcyI6WzYuNjgxOTI0MDgzNDM5ODgzLDAuNzkzNTMwMDAwNzUxNjgzN10sImFsaWdubWVudCI6ImNlbnRlciIsInR5cGVzZXRBc01hdGgiOnRydWUsInN0eWxlIjp7ImZpbGwtb3BhY2l0eSI6IjAiLCJjb2xvciI6ImJsYWNrIn19XX0pOw==',
  }),
};

function assetBytes(dataUrl) {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function manifestXml(identifier, itemPath, dependencyPaths) {
  const files = [itemPath, ...dependencyPaths]
    .map(path => `<file href="${path}" />`)
    .join('\n        ');
  return `<?xml version="1.0" encoding="UTF-8"?>
  <manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" identifier="manifest-${identifier}">
    <resources>
      <resource identifier="${identifier}" type="imsqti_item_xmlv3p0" href="${itemPath}">
        ${files}
      </resource>
    </resources>
  </manifest>`;
}

export function perseusZipEntries(itemId, xml) {
  const fixture = perseusFixtures[itemId];
  if (!fixture) {
    return null;
  }
  const itemPath = `${itemId}.xml`;
  const entries = { [itemPath]: xml };
  for (const [path, content] of Object.entries(fixture.files)) {
    entries[path] = content.startsWith('data:') ? assetBytes(content) : content;
  }
  entries['imsmanifest.xml'] = manifestXml(itemId, itemPath, Object.keys(fixture.files));
  return entries;
}

// The caller owns the returned URL, and is responsible for revoking it.
export async function perseusPackageUrl(itemId, xml) {
  const entries = perseusZipEntries(itemId, xml);
  if (!entries) {
    return null;
  }
  const zipBytes = await createZipBytes(entries);
  return URL.createObjectURL(new Blob([zipBytes], { type: 'application/zip' }));
}

export default perseusFixtures;

import { expect, it } from 'vitest';

import { EXPORT_EDITOR_CONTROL_SELECTORS } from './DiagramExportMenu';

it('remove somente controles de edição e preserva os elementos estruturais das conexões', () => {
  expect(EXPORT_EDITOR_CONTROL_SELECTORS).toEqual(
    expect.arrayContaining(['.react-flow__handle', '.react-flow__resize-control', '[data-export-editor-control]']),
  );
  expect(EXPORT_EDITOR_CONTROL_SELECTORS).not.toContain('.react-flow__edges');
  expect(EXPORT_EDITOR_CONTROL_SELECTORS).not.toContain('.react-flow__edge');
  expect(EXPORT_EDITOR_CONTROL_SELECTORS).not.toContain('.react-flow__edge-path');
});

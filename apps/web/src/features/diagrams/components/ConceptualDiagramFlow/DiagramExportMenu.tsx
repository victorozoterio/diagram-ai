import type { Node } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { type ChangeEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorKeyboardShortcuts } from '../../hooks/useEditorKeyboardShortcuts';
import { type DiagramAiProject, parseDiagramAiProject } from '../../types';
import styles from './DiagramExportMenu.module.css';

type DiagramExportMenuProps = {
  flowWrapperRef: RefObject<HTMLDivElement | null>;
  nodes: Node[];
  portalTarget?: Element | null;
  disabled?: boolean;
  getEditableProject?: () => DiagramAiProject;
  onOpenProject?: (project: DiagramAiProject) => void | Promise<void>;
  onNavigateToDiagrams?: () => void;
  onSaveProject?: (project: DiagramAiProject) => Promise<void>;
  isSavingProject?: boolean;
};

const EXPORT_PADDING = 32;
const EXPORT_PIXEL_RATIO = 2;
export const EXPORT_EDITOR_CONTROL_SELECTORS = [
  '.react-flow__resize-control',
  '.react-flow__handle',
  '.react-flow__selection',
  '.react-flow__nodesselection',
  '.react-flow__edgeupdater',
  '[data-export-editor-control]',
] as const;

export function DiagramExportMenu({
  flowWrapperRef,
  nodes,
  portalTarget,
  disabled = false,
  getEditableProject,
  onOpenProject,
  onNavigateToDiagrams,
  onSaveProject,
  isSavingProject = false,
}: DiagramExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportSubmenuOpen, setIsExportSubmenuOpen] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setIsExportSubmenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const createDiagramImage = useCallback(async () => {
    const viewport = flowWrapperRef.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport || nodes.length === 0) {
      throw new Error('Não há elementos no diagrama para exportar.');
    }

    const bounds = getExportBounds(nodes);
    const width = Math.max(1, Math.ceil(bounds.width + EXPORT_PADDING * 2));
    const height = Math.max(1, Math.ceil(bounds.height + EXPORT_PADDING * 2));
    const restoreExportPresentation = applyCleanExportPresentation(viewport);
    const restoreSvgStyles = inlineSvgStylesForExport(viewport);
    const restoreHtmlStyles = inlineHtmlStylesForExport(viewport);

    try {
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#f8fafc',
        width,
        height,
        pixelRatio: EXPORT_PIXEL_RATIO,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          overflow: 'visible',
          transform: `translate(${EXPORT_PADDING - bounds.x}px, ${EXPORT_PADDING - bounds.y}px)`,
          transformOrigin: 'top left',
        },
        filter: (element) => {
          if (!(element instanceof HTMLElement)) return true;

          return ![
            'react-flow__resize-control',
            'react-flow__selection',
            'react-flow__nodesselection',
            'react-flow__edgeupdater',
          ].some((className) => element.classList.contains(className));
        },
      });

      return { dataUrl, width, height };
    } finally {
      restoreSvgStyles();
      restoreHtmlStyles();
      restoreExportPresentation();
    }
  }, [flowWrapperRef, nodes]);

  const runExport = useCallback(
    async (action: 'download' | 'clipboard' | 'pdf') => {
      setIsExporting(true);
      setMessage('');

      try {
        const image = await createDiagramImage();

        if (action === 'download') {
          downloadDataUrl(image.dataUrl, 'diagrama-conceitual.png');
          setMessage('PNG baixado.');
        } else if (action === 'clipboard') {
          await copyDataUrlToClipboard(image.dataUrl);
          setMessage('Imagem copiada.');
        } else {
          downloadPdf(image.dataUrl, image.width, image.height);
          setMessage('PDF baixado.');
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível exportar o diagrama.');
      } finally {
        setIsExporting(false);
      }
    },
    [createDiagramImage],
  );

  const downloadEditableProjectFile = useCallback(() => {
    if (!getEditableProject) return;

    setMessage('');
    try {
      const project = getEditableProject();
      downloadEditableProject(project);
      setMessage('Projeto editável baixado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível exportar o projeto editável.');
    }
  }, [getEditableProject]);

  const saveEditableProject = useCallback(async () => {
    if (!getEditableProject || !onSaveProject) return;

    setMessage('');
    try {
      await onSaveProject(getEditableProject());
      setMessage('Diagrama salvo na nuvem.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o diagrama na nuvem.');
    }
  }, [getEditableProject, onSaveProject]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setIsExportSubmenuOpen(false);
  }, []);

  const canSaveProject = !disabled && !!getEditableProject && !!onSaveProject && !isExporting && !isSavingProject;
  const canDownloadProject = !disabled && !!getEditableProject && !isExporting && !isSavingProject;

  useEditorKeyboardShortcuts({
    canDownload: canDownloadProject,
    canSave: canSaveProject,
    onDownload: downloadEditableProjectFile,
    onSave: () => void saveEditableProject(),
  });

  const runMenuExport = useCallback(
    (action: 'download' | 'pdf') => {
      closeMenu();
      void runExport(action);
    },
    [closeMenu, runExport],
  );

  const openProjectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const importProjectFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !onOpenProject) return;

      setMessage('');
      try {
        if (!file.name.toLowerCase().endsWith('.diagramai')) {
          throw new Error('Selecione um arquivo com extensão .diagramai.');
        }

        const project = parseDiagramAiProject(JSON.parse(await file.text()));
        await onOpenProject(project);
        setMessage('Arquivo aberto.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o arquivo.');
      }
    },
    [onOpenProject],
  );

  const menu = (
    <div ref={containerRef} className={styles.container}>
      <button
        className={styles.trigger}
        type='button'
        aria-expanded={isOpen}
        aria-haspopup='menu'
        onClick={() => {
          setIsOpen((open) => !open);
          setIsExportSubmenuOpen(false);
          setMessage('');
        }}
      >
        Arquivo
        <svg className={styles.chevron} viewBox='0 0 12 12' aria-hidden='true'>
          <path
            d='m3 4.5 3 3 3-3'
            fill='none'
            stroke='currentColor'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='1.5'
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.menu} role='menu' aria-label='Opções de exportação'>
          <input
            ref={fileInputRef}
            className={styles.fileInput}
            type='file'
            accept='.diagramai,application/json'
            onChange={importProjectFile}
          />
          <button
            type='button'
            role='menuitem'
            onClick={() => {
              closeMenu();
              onNavigateToDiagrams?.();
            }}
          >
            Meus diagramas
          </button>
          <span className={styles.divider} aria-hidden='true' />
          <button type='button' role='menuitem' disabled={!onOpenProject || isExporting} onClick={openProjectFile}>
            Abrir arquivo
          </button>
          <button
            className={styles.menuAction}
            type='button'
            role='menuitem'
            disabled={!canSaveProject}
            onClick={() => void saveEditableProject()}
          >
            <span>{isSavingProject ? 'Salvando...' : 'Salvar'}</span>
            <kbd>Ctrl+S</kbd>
          </button>
          <button
            className={styles.menuAction}
            type='button'
            role='menuitem'
            disabled={!canDownloadProject}
            onClick={downloadEditableProjectFile}
          >
            <span>Salvar como</span>
            <kbd>Ctrl+Shift+S</kbd>
          </button>
          <span className={styles.divider} aria-hidden='true' />
          <button
            type='button'
            role='menuitem'
            disabled={disabled || isExporting || isSavingProject}
            onClick={() => runExport('clipboard')}
          >
            Copiar imagem
          </button>
          <div className={styles.submenuContainer} role='presentation'>
            <button
              className={styles.submenuTrigger}
              type='button'
              role='menuitem'
              aria-haspopup='menu'
              aria-expanded={isExportSubmenuOpen}
              disabled={disabled || isExporting || isSavingProject}
              onMouseEnter={() => setIsExportSubmenuOpen(true)}
              onClick={() => setIsExportSubmenuOpen((open) => !open)}
            >
              <span>Exportar como</span>
              <span className={styles.submenuArrow} aria-hidden='true'>
                ›
              </span>
            </button>
            {isExportSubmenuOpen && (
              <div className={styles.submenu} role='menu' aria-label='Formatos de exportação'>
                <button
                  type='button'
                  role='menuitem'
                  disabled={disabled || isExporting || isSavingProject}
                  onClick={() => runMenuExport('download')}
                >
                  PNG
                </button>
                <button
                  type='button'
                  role='menuitem'
                  disabled={disabled || isExporting || isSavingProject}
                  onClick={() => runMenuExport('pdf')}
                >
                  PDF
                </button>
              </div>
            )}
          </div>
          {isExporting && <span className={styles.feedback}>Preparando imagem...</span>}
          {!isExporting && message && <span className={styles.feedback}>{message}</span>}
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(menu, portalTarget) : null;
}

/**
 * A biblioteca captura o viewport real porque a cópia isolada do SVG perde
 * arestas do React Flow. Estes estilos são aplicados apenas durante a captura
 * e restaurados exatamente depois, sem mudar o estado selecionado dos nodes.
 */
export function applyCleanExportPresentation(viewport: HTMLElement): () => void {
  const previousStyles = new Map<HTMLElement | SVGElement, string | null>();
  const updateStyle = (element: HTMLElement | SVGElement, update: () => void) => {
    if (!previousStyles.has(element)) previousStyles.set(element, element.getAttribute('style'));
    update();
  };

  viewport.querySelectorAll<HTMLElement | SVGElement>(EXPORT_EDITOR_CONTROL_SELECTORS.join(',')).forEach((element) => {
    updateStyle(element, () => element.style.setProperty('display', 'none'));
  });

  viewport.querySelectorAll<HTMLElement | SVGElement>("[class*='selected']").forEach((element) => {
    updateStyle(element, () => element.style.setProperty('filter', 'none'));
  });

  resetExportEdgeStyle(viewport, 'diagram-export-attribute-edge', '#94a3b8', '1.5', updateStyle);
  resetExportEdgeStyle(viewport, 'diagram-export-relationship-edge', '#b1b1b7', '1', updateStyle);
  resetExportEdgeStyle(viewport, 'diagram-export-logical-edge', '#94a3b8', '1.5', updateStyle);

  return () => {
    previousStyles.forEach((style, element) => {
      if (style === null) {
        element.removeAttribute('style');
      } else {
        element.setAttribute('style', style);
      }
    });
  };
}

function resetExportEdgeStyle(
  viewport: HTMLElement,
  className: string,
  stroke: string,
  strokeWidth: string,
  updateStyle: (element: HTMLElement | SVGElement, update: () => void) => void,
): void {
  viewport.querySelectorAll<SVGElement>(`.${className}`).forEach((edge) => {
    updateStyle(edge, () => {
      edge.style.setProperty('stroke', stroke);
      edge.style.setProperty('stroke-width', strokeWidth);
      edge.style.removeProperty('filter');
    });
  });
}

function getExportBounds(nodes: Node[]) {
  const boxes = nodes.map((node) => {
    const width = node.width ?? node.measured?.width ?? node.initialWidth ?? styleDimension(node.style?.width);
    const height = node.height ?? node.measured?.height ?? node.initialHeight ?? styleDimension(node.style?.height);
    const origin = node.origin ?? [0, 0];

    return {
      x: node.position.x - width * origin[0],
      y: node.position.y - height * origin[1],
      x2: node.position.x - width * origin[0] + width,
      y2: node.position.y - height * origin[1] + height,
    };
  });

  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const x2 = Math.max(...boxes.map((box) => box.x2));
  const y2 = Math.max(...boxes.map((box) => box.y2));

  return { x, y, width: x2 - x, height: y2 - y };
}

function styleDimension(value: number | string | undefined) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const HTML_PRESENTATION_PROPERTIES = [
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-bottom-color',
  'border-bottom-style',
  'border-bottom-width',
  'border-left',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-radius',
  'border-right',
  'border-right-color',
  'border-right-style',
  'border-right-width',
  'border-top',
  'border-top-color',
  'border-top-style',
  'border-top-width',
  'box-shadow',
  'color',
];

function inlineHtmlStylesForExport(viewport: HTMLElement) {
  const elements = Array.from(viewport.querySelectorAll<HTMLElement>('[data-export-preserve-style]'));
  const previousStyles = elements.map((element) => ({
    element,
    style: element.getAttribute('style'),
  }));

  elements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element);
    HTML_PRESENTATION_PROPERTIES.forEach((property) => {
      const value = computedStyle.getPropertyValue(property);
      if (value) element.style.setProperty(property, value);
    });

    preserveLogicalTableBorders(element);
  });

  return () => {
    previousStyles.forEach(({ element, style }) => {
      if (style === null) {
        element.removeAttribute('style');
      } else {
        element.setAttribute('style', style);
      }
    });
  };
}

function preserveLogicalTableBorders(element: HTMLElement) {
  if (element.dataset.exportPreserveStyle === 'logical-table') {
    ['top', 'right', 'bottom', 'left'].forEach((side) => {
      element.style.setProperty(`border-${side}-width`, '1px', 'important');
      element.style.setProperty(`border-${side}-style`, 'solid', 'important');
      element.style.setProperty(`border-${side}-color`, '#6366f1', 'important');
    });
    element.style.setProperty('box-sizing', 'border-box', 'important');
  }

  if (element.dataset.exportPreserveStyle === 'logical-table-title') {
    element.style.setProperty('border-bottom-width', '1px', 'important');
    element.style.setProperty('border-bottom-style', 'solid', 'important');
    element.style.setProperty('border-bottom-color', '#6366f1', 'important');
  }

  if (element.dataset.exportPreserveStyle === 'logical-table-content') {
    element.style.setProperty('box-sizing', 'border-box', 'important');
    element.style.setProperty('width', 'calc(100% - 2px)', 'important');
    element.style.setProperty('height', 'calc(100% - 2px)', 'important');
    element.style.setProperty('min-height', 'calc(100% - 2px)', 'important');
    element.style.setProperty('margin', '1px', 'important');
  }
}

const SVG_PRESENTATION_PROPERTIES = [
  'display',
  'fill',
  'fill-opacity',
  'filter',
  'opacity',
  'pointer-events',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'visibility',
  'vector-effect',
];

function inlineSvgStylesForExport(viewport: HTMLElement) {
  const svgElements = Array.from(viewport.querySelectorAll<SVGElement>('.react-flow__edges svg, .react-flow__edges *'));
  const previousStyles = svgElements.map((element) => ({
    element,
    style: element.getAttribute('style'),
  }));

  svgElements.forEach((element) => {
    const computedStyle = window.getComputedStyle(element);
    SVG_PRESENTATION_PROPERTIES.forEach((property) => {
      const value = computedStyle.getPropertyValue(property);
      if (value) element.style.setProperty(property, value);
    });
  });

  return () => {
    previousStyles.forEach(({ element, style }) => {
      if (style === null) {
        element.removeAttribute('style');
      } else {
        element.setAttribute('style', style);
      }
    });
  };
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

function downloadEditableProject(project: DiagramAiProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `diagrama-${project.modelType}.diagramai`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyDataUrlToClipboard(dataUrl: string) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('A cópia de imagens não é suportada neste navegador.');
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

function downloadPdf(dataUrl: string, width: number, height: number) {
  const widthMm = (width * 25.4) / 96;
  const heightMm = (height * 25.4) / 96;
  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  pdf.save('diagrama-conceitual.pdf');
}

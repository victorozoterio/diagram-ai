import type { Node } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { type RefObject, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DiagramAiProject } from '../../types';
import styles from './DiagramExportMenu.module.css';

type DiagramExportMenuProps = {
  flowWrapperRef: RefObject<HTMLDivElement | null>;
  nodes: Node[];
  portalTarget?: Element | null;
  disabled?: boolean;
  getEditableProject?: () => DiagramAiProject;
};

const EXPORT_PADDING = 32;
const EXPORT_PIXEL_RATIO = 2;

export function DiagramExportMenu({
  flowWrapperRef,
  nodes,
  portalTarget,
  disabled = false,
  getEditableProject,
}: DiagramExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const createDiagramImage = useCallback(async () => {
    const viewport = flowWrapperRef.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport || nodes.length === 0) {
      throw new Error('Não há elementos no diagrama para exportar.');
    }

    const bounds = getExportBounds(nodes);
    const width = Math.max(1, Math.ceil(bounds.width + EXPORT_PADDING * 2));
    const height = Math.max(1, Math.ceil(bounds.height + EXPORT_PADDING * 2));

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

  const exportEditableProject = useCallback(() => {
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

  const menu = (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        type='button'
        aria-expanded={isOpen}
        aria-haspopup='menu'
        disabled={disabled}
        onClick={() => {
          setIsOpen((open) => !open);
          setMessage('');
        }}
      >
        Exportar
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
          <button type='button' role='menuitem' disabled={isExporting} onClick={() => runExport('clipboard')}>
            Copiar imagem
          </button>
          <button type='button' role='menuitem' disabled={isExporting} onClick={() => runExport('download')}>
            Baixar como PNG
          </button>
          <button type='button' role='menuitem' disabled={isExporting} onClick={() => runExport('pdf')}>
            Baixar como PDF
          </button>
          {getEditableProject && (
            <button type='button' role='menuitem' disabled={isExporting} onClick={exportEditableProject}>
              Baixar projeto editável
            </button>
          )}
          {isExporting && <span className={styles.feedback}>Preparando imagem...</span>}
          {!isExporting && message && <span className={styles.feedback}>{message}</span>}
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(menu, portalTarget) : null;
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

import { getNodesBounds, type Node } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { type RefObject, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DiagramExportMenu.module.css';

type DiagramExportMenuProps = {
  flowWrapperRef: RefObject<HTMLDivElement | null>;
  nodes: Node[];
  portalTarget?: Element | null;
};

const EXPORT_PADDING = 56;
const EXPORT_PIXEL_RATIO = 2;

export function DiagramExportMenu({ flowWrapperRef, nodes, portalTarget }: DiagramExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');

  const createDiagramImage = useCallback(async () => {
    const viewport = flowWrapperRef.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport || nodes.length === 0) {
      throw new Error('Não há elementos no diagrama para exportar.');
    }

    const bounds = getNodesBounds(nodes);
    const width = Math.max(1, Math.ceil(bounds.width + EXPORT_PADDING * 2));
    const height = Math.max(1, Math.ceil(bounds.height + EXPORT_PADDING * 2));

    const restoreSvgStyles = inlineSvgStylesForExport(viewport);

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

  const menu = (
    <div className={styles.container}>
      <button
        className={styles.trigger}
        type='button'
        aria-expanded={isOpen}
        aria-haspopup='menu'
        onClick={() => {
          setIsOpen((open) => !open);
          setMessage('');
        }}
      >
        Exportar
        <span aria-hidden='true'>⌄</span>
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
          {isExporting && <span className={styles.feedback}>Preparando imagem...</span>}
          {!isExporting && message && <span className={styles.feedback}>{message}</span>}
        </div>
      )}
    </div>
  );

  return portalTarget ? createPortal(menu, portalTarget) : null;
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

import {
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type EditableNodeNameProps = {
  value: string;
  ariaLabel: string;
  containerRef: RefObject<HTMLDivElement | null>;
  normalClassName: string;
  editingClassName: string;
  textSafeArea: TextSafeArea;
  onSave: (name: string) => void;
  onSelect?: () => void;
  stopPropagationOnKeyDown?: boolean;
};

export type TextSafeArea = {
  maxWidth: number;
  maxHeight: number;
  baseFontSize?: number;
  minFontSize: number;
  horizontalPadding?: number;
  verticalPadding?: number;
};

export function EditableNodeName({
  value,
  ariaLabel,
  containerRef,
  normalClassName,
  editingClassName,
  textSafeArea,
  onSave,
  onSelect,
  stopPropagationOnKeyDown = false,
}: EditableNodeNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(value);
  const [editPosition, setEditPosition] = useState({ left: 0, top: 0 });
  const [editorWidth, setEditorWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !inputRef.current) return;
    setEditorWidth(measureTextWidth(inputRef.current, draftName || ' '));
  }, [draftName, isEditing]);

  function startEditing() {
    if (containerRef.current && textRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const textRect = textRef.current.getBoundingClientRect();
      setEditPosition({
        left: textRect.left - containerRect.left,
        top: textRect.top - containerRect.top - 5,
      });
    }
    setDraftName(value);
    setIsEditing(true);
  }

  function saveName() {
    const name = draftName.trim();
    if (name) onSave(name);
    else setDraftName(value);
    setIsEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (stopPropagationOnKeyDown) event.stopPropagation();
    if (event.key === 'Escape') {
      setDraftName(value);
      setIsEditing(false);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      saveName();
    }
  }

  const normalFontSize = getResponsiveNameFontSize(value, textSafeArea);
  const editorStyle: CSSProperties = {
    position: 'absolute',
    left: `${editPosition.left}px`,
    top: `${editPosition.top}px`,
    zIndex: 3,
    display: 'inline-block',
    width: `${editorWidth}px`,
    minWidth: 0,
    maxWidth: 'none',
    boxSizing: 'content-box',
    overflow: 'visible',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    transform: 'none',
    fontSize: `${normalFontSize}px`,
  };

  const normalStyle: CSSProperties = {
    width: `${textSafeArea.maxWidth}px`,
    maxWidth: `${textSafeArea.maxWidth}px`,
    maxHeight: `${textSafeArea.maxHeight}px`,
    fontSize: `${normalFontSize}px`,
  };

  return isEditing ? (
    <input
      ref={inputRef}
      className={`${editingClassName} nodrag`}
      value={draftName}
      onChange={(event) => setDraftName(event.target.value)}
      onBlur={saveName}
      onKeyDown={handleKeyDown}
      style={editorStyle}
      aria-label={ariaLabel}
    />
  ) : (
    <button
      className={normalClassName}
      type='button'
      onClick={onSelect}
      onDoubleClick={startEditing}
      style={normalStyle}
      aria-label={ariaLabel}
    >
      <span ref={textRef}>{value}</span>
    </button>
  );
}

export function getResponsiveNameFontSize(name: string, safeArea: TextSafeArea) {
  const textLength = Math.max(name.trim().length, 1);
  const lineHeight = 1.05;
  const horizontalPadding = safeArea.horizontalPadding ?? 8;
  const verticalPadding = safeArea.verticalPadding ?? 6;
  const contentWidth = Math.max(12, safeArea.maxWidth - horizontalPadding);
  const contentHeight = Math.max(12, safeArea.maxHeight - verticalPadding);

  for (let size = safeArea.baseFontSize ?? 16; size >= safeArea.minFontSize; size -= 0.5) {
    const charactersPerLine = Math.max(1, Math.floor(contentWidth / (size * 0.56)));
    const lines = Math.ceil(textLength / charactersPerLine);
    if (lines * size * lineHeight <= contentHeight) return size;
  }

  return safeArea.minFontSize;
}

function measureTextWidth(input: HTMLInputElement, value: string) {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return value.length * 8;

  const style = window.getComputedStyle(input);
  context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const letterSpacing = Number.parseFloat(style.letterSpacing);
  const spacingWidth = Number.isFinite(letterSpacing) ? Math.max(0, value.length - 1) * letterSpacing : 0;

  return Math.ceil(context.measureText(value).width + spacingWidth);
}

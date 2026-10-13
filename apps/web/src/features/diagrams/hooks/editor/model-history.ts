export type ModelHistory<T> = {
  initialized: boolean;
  present: T | undefined;
  undo: T[];
  redo: T[];
};

export function createModelHistory<T>(): ModelHistory<T> {
  return { initialized: false, present: undefined, undo: [], redo: [] };
}

export function recordModelHistory<T>(
  history: ModelHistory<T>,
  snapshot: T,
  hasChanged: (previous: T, next: T) => boolean,
): boolean {
  if (!history.initialized) {
    history.initialized = true;
    history.present = snapshot;
    return false;
  }

  const previous = history.present as T;
  if (!hasChanged(previous, snapshot)) return false;

  history.undo.push(previous);
  history.present = snapshot;
  history.redo = [];
  return true;
}

export function undoModelHistory<T>(history: ModelHistory<T>): T | undefined {
  if (!history.initialized || history.undo.length === 0) return undefined;

  const previous = history.undo.pop() as T;
  history.redo.push(history.present as T);
  history.present = previous;
  return previous;
}

export function redoModelHistory<T>(history: ModelHistory<T>): T | undefined {
  if (!history.initialized || history.redo.length === 0) return undefined;

  const next = history.redo.pop() as T;
  history.undo.push(history.present as T);
  history.present = next;
  return next;
}

export function resetModelHistory<T>(history: ModelHistory<T>): void {
  history.initialized = false;
  history.present = undefined;
  history.undo = [];
  history.redo = [];
}

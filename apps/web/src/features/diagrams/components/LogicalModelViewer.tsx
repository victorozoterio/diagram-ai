import type { LogicalModel } from '../types/logical-model';

type LogicalModelViewerProps = {
  model: LogicalModel;
};

export function LogicalModelViewer({ model }: LogicalModelViewerProps) {
  return (
    <div className='cards-grid'>
      {model.tables.map((table) => (
        <article key={table.id} className='model-card table-card'>
          <h4>{table.name}</h4>

          <ul>
            {table.columns.map((column) => (
              <li key={column.id}>
                {column.primaryKey && <strong>PK </strong>}
                {column.foreignKey && <strong>FK </strong>}

                <span>{column.name}</span>
                <small>{column.type}</small>

                {column.required && <em> NOT NULL</em>}
                {column.unique && <em> UNIQUE</em>}

                {column.references && (
                  <em>
                    {' '}
                    → {column.references.tableId}.{column.references.columnId}
                  </em>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

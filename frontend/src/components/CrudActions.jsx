import { Button } from 'react-bootstrap';
import { FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

function CrudActions({
  addLabel,
  className = '',
  editLabel,
  deleteLabel,
  onAdd,
  onEdit,
  onDelete,
  size = 'sm',
  stopPropagation = false,
}) {
  const handleClick = (event, callback) => {
    if (stopPropagation) {
      event.stopPropagation();
    }

    callback?.(event);
  };

  return (
    <div className={`crud-actions ${className}`.trim()}>
      {onAdd && (
        <Button variant="success" size={size} onClick={(event) => handleClick(event, onAdd)} aria-label={addLabel}>
          <FaPlus className={addLabel ? 'me-2' : ''} />
          {addLabel}
        </Button>
      )}
      {onEdit && (
        <Button variant="outline-success" size={size} onClick={(event) => handleClick(event, onEdit)} aria-label={editLabel}>
          <FaEdit />
        </Button>
      )}
      {onDelete && (
        <Button variant="outline-danger" size={size} onClick={(event) => handleClick(event, onDelete)} aria-label={deleteLabel}>
          <FaTrash />
        </Button>
      )}
    </div>
  );
}

export default CrudActions;

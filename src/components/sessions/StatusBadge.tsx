interface StatusBadgeProps {
  status: 'open' | 'in_progress' | 'archived'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800', 
    archived: 'bg-gray-100 text-gray-800'
  }

  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    archived: 'Archived'
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
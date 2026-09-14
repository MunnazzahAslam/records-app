import './TableSkeleton.css';

const SKELETON_ROW_COUNT = 8;
// Widths vary per row so the placeholder reads as text, not a solid bar —
// purely cosmetic, has no relationship to real data.
const NAME_WIDTHS = [72, 58, 84, 64, 70, 60, 76, 66];
const EMAIL_WIDTHS = [82, 68, 90, 74, 60, 86, 70, 78];
const ROLE_WIDTHS = [70, 84, 60, 76, 66, 90, 72, 62];

export function TableSkeleton() {
  return (
    <div className="skeleton-table" role="status" aria-live="polite" aria-label="Loading employee records">
      <div className="skeleton-row skeleton-header-row">
        <span className="skeleton-header-label">ID</span>
        <span className="skeleton-header-label">Name</span>
        <span className="skeleton-header-label">Email</span>
        <span className="skeleton-header-label">Department</span>
        <span className="skeleton-header-label">Role</span>
        <span className="skeleton-header-label">Status</span>
        <span className="skeleton-header-label">Actions</span>
      </div>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton-block" style={{ width: '28px' }} />
          <span className="skeleton-name-cell">
            <span className="skeleton-block skeleton-avatar" />
            <span className="skeleton-block" style={{ width: `${NAME_WIDTHS[index % NAME_WIDTHS.length]}px` }} />
          </span>
          <span className="skeleton-block" style={{ width: `${EMAIL_WIDTHS[index % EMAIL_WIDTHS.length]}%` }} />
          <span className="skeleton-block" style={{ width: '72px' }} />
          <span className="skeleton-block" style={{ width: `${ROLE_WIDTHS[index % ROLE_WIDTHS.length]}px` }} />
          <span className="skeleton-block" style={{ width: '58px' }} />
          <span className="skeleton-block" style={{ width: '48px' }} />
        </div>
      ))}
    </div>
  );
}

import type { TreeMonthlyStatus } from '../lib/supabase';

export interface TreeMonthlyTrackerProps {
  treeStatus: TreeMonthlyStatus[];
  onSelectTreeMonth: (treeId: string, month: number) => void;
  loading?: boolean;
}

export function TreeMonthlyTracker({ treeStatus, onSelectTreeMonth, loading = false }: TreeMonthlyTrackerProps) {
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading tree status...</div>;
  }

  if (treeStatus.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        color: '#666'
      }}>
        <p>No trees found. Please add trees to your farm first.</p>
      </div>
    );
  }

  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Monthly Updates by Tree</h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
          Each tree needs 12 monthly photos per year. Click on a month to upload a photo.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {treeStatus.map((tree) => {
          const completionPercentage = (tree.completed_months.length / 12) * 100;
          const isComplete = tree.completed_months.length === 12;

          return (
            <div
              key={tree.tree_id}
              style={{
                padding: '1.5rem',
                backgroundColor: isComplete ? '#f0fdf4' : 'white',
                border: `2px solid ${isComplete ? '#22c55e' : '#e5e5e5'}`,
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
            >
              {/* Tree header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                    {tree.tree_number || `Tree ${tree.tree_id.slice(0, 8)}`}
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                    {tree.completed_months.length} of 12 months completed
                  </p>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isComplete ? '#d1fae5' : '#f0f9ff',
                  color: isComplete ? '#065f46' : '#1e40af',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  {completionPercentage.toFixed(0)}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e5e5',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: `${completionPercentage}%`,
                  height: '100%',
                  backgroundColor: isComplete ? '#22c55e' : '#8B6F47',
                  transition: 'width 0.3s'
                }} />
              </div>

              {/* Month grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                gap: '0.5rem'
              }}>
                {allMonths.map((month) => {
                  const isCompleted = tree.completed_months.includes(month);
                  const isMissing = tree.missing_months.includes(month);

                  return (
                    <button
                      key={month}
                      onClick={() => onSelectTreeMonth(tree.tree_id, month)}
                      disabled={isCompleted}
                      style={{
                        padding: '0.75rem 0.5rem',
                        backgroundColor: isCompleted 
                          ? '#d1fae5' 
                          : isMissing 
                            ? '#fee2e2' 
                            : '#f0f9ff',
                        color: isCompleted 
                          ? '#065f46' 
                          : isMissing 
                            ? '#991b1b' 
                            : '#1e40af',
                        border: `2px solid ${isCompleted ? '#22c55e' : isMissing ? '#ef4444' : '#bfdbfe'}`,
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: isCompleted ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCompleted) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCompleted) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <span>{month}</span>
                      {isCompleted && <span style={{ fontSize: '0.7rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#666',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <span>
                  <span style={{ color: '#22c55e', fontWeight: '600' }}>✓</span> Completed
                </span>
                <span>
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>●</span> Missing
                </span>
                <span>
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>○</span> Pending
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


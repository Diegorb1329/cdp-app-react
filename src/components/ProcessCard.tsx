import type { FarmProcessStep } from '../lib/supabase';

export interface ProcessCardProps {
  title: string;
  icon: string;
  description: string;
  completedSteps: FarmProcessStep[];
  onStart: () => void;
  canStart: boolean;
  nextStepLabel?: string;
}

export function ProcessCard({ 
  title, 
  icon, 
  description, 
  completedSteps, 
  onStart, 
  canStart,
  nextStepLabel 
}: ProcessCardProps) {
  const isCompleted = completedSteps.length > 0;
  const stepCount = completedSteps.length;

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: isCompleted ? '#f0fdf4' : 'white',
      border: `2px solid ${isCompleted ? '#22c55e' : '#e5e5e5'}`,
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      transition: 'all 0.2s',
      boxShadow: isCompleted ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
    }}
    onMouseEnter={(e) => {
      if (!isCompleted) {
        e.currentTarget.style.borderColor = '#8B6F47';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isCompleted) {
        e.currentTarget.style.borderColor = '#e5e5e5';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{title}</h3>
        </div>
        {isCompleted && (
          <span style={{ 
            color: '#22c55e', 
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            ✓
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{ 
        color: '#666', 
        fontSize: '0.9rem', 
        margin: 0,
        lineHeight: '1.5'
      }}>
        {description}
      </p>

      {/* Progress info */}
      {stepCount > 0 && (
        <div style={{ 
          padding: '0.75rem',
          backgroundColor: isCompleted ? '#dcfce7' : '#f0f9ff',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: isCompleted ? '#166534' : '#1e40af'
        }}>
          <strong>{stepCount}</strong> photo{stepCount !== 1 ? 's' : ''} uploaded
          {completedSteps.length > 0 && completedSteps[0].completed_at && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', opacity: 0.8 }}>
              Last: {new Date(completedSteps[0].completed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Step list for monthly updates */}
      {title === 'Monthly Updates' && stepCount > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.5rem',
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          {completedSteps
            .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
            .map((step) => (
              <span
                key={step.id}
                style={{
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              >
                Month {step.step_number}
              </span>
            ))}
        </div>
      )}

      {/* Action button */}
      <button
        onClick={onStart}
        disabled={!canStart}
        style={{
          padding: '0.75rem 1rem',
          backgroundColor: canStart ? '#8B6F47' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.95rem',
          fontWeight: '500',
          cursor: canStart ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
          marginTop: 'auto'
        }}
        onMouseEnter={(e) => {
          if (canStart) {
            e.currentTarget.style.backgroundColor = '#6b5638';
          }
        }}
        onMouseLeave={(e) => {
          if (canStart) {
            e.currentTarget.style.backgroundColor = '#8B6F47';
          }
        }}
      >
        {isCompleted 
          ? `📸 Add Another Photo` 
          : nextStepLabel 
            ? `📸 ${nextStepLabel}`
            : `📸 Start Process`}
      </button>
    </div>
  );
}


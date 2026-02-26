import type { TranscodeStatus } from "../api";

export const TranscodeBadge = ({ status }: { status: TranscodeStatus | null | undefined }) => {
  if (status === undefined) return null;

  if (!status || status.status === 'Pending or Not Found')
    return <span style={{ color: '#555', fontSize: '0.75rem' }}>Not transcoded</span>;

  if (status.status === 'Completed')
    return <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 600 }}>✓ Ready</span>;

  if (status.status === 'Processing')
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 56, height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${status.percentageStatus}%`, height: '100%', background: '#f59e0b', borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
        <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600 }}>
          {Math.round(status.percentageStatus)}%
        </span>
      </div>
    );

  if (status.status === 'Failed')
    return <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>✗ Failed</span>;

  return null;
};

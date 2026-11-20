import { useState, useRef, useEffect } from 'react';

export function ProgressBar({
  position = 0,
  duration = 0,
  onSeek,
  isDragging = false
}) {
  const progressRef = useRef(null);
  const [dragPosition, setDragPosition] = useState(0);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = progressRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newPosition = percentage * duration;
    setDragPosition(newPosition);
    isDragging = true;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newPosition = Math.max(0, Math.min(duration, percentage * duration));
    setDragPosition(newPosition);
  };

  const handleMouseUp = () => {
    if (isDragging && onSeek) {
      onSeek(dragPosition);
    }
    isDragging = false;
  };

  useEffect(() => {
    if (!isDragging) {
      setDragPosition(position);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position, duration, isDragging]);

  const progressPercent = duration > 0 ? (dragPosition / duration) * 100 : 0;

  return (
    <div className="progress-container">
      <div
        ref={progressRef}
        className="progress-bar"
        onMouseDown={handleMouseDown}
      >
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        <div className="progress-thumb" style={{ left: `${progressPercent}%` }} />
      </div>
      <div className="time-display">
        <span className="time">{formatTime(dragPosition)}</span>
        <span className="time-divider"> / </span>
        <span className="time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default ProgressBar;
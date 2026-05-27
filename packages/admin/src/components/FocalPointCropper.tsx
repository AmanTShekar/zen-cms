import React, { useState, useRef } from 'react'

interface FocalPointCropperProps {
  imageUrl: string
  initialX?: number
  initialY?: number
  onSave?: (x: number, y: number) => void
}

export const FocalPointCropper: React.FC<FocalPointCropperProps> = ({
  imageUrl,
  initialX = 50,
  initialY = 50,
  onSave
}) => {
  const [focalPoint, setFocalPoint] = useState({ x: initialX, y: initialY })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Calculate percentages
    const xPct = Math.round((clickX / rect.width) * 100)
    const yPct = Math.round((clickY / rect.height) * 100)

    // Constrain 0-100
    const constrainedX = Math.max(0, Math.min(100, xPct))
    const constrainedY = Math.max(0, Math.min(100, yPct))

    setFocalPoint({ x: constrainedX, y: constrainedY })
  }

  const triggerSave = () => {
    if (onSave) {
      onSave(focalPoint.x, focalPoint.y)
    }
  }

  return (
    <div
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto',
        fontFamily: "'Inter', sans-serif",
        color: '#F3F4F6'
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px',
          color: '#F3F4F6',
          letterSpacing: '-0.025em'
        }}
      >
        AI Focal Point & Responsive Cropper
      </h3>
      <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px', lineHeight: '1.4' }}>
        Click anywhere on the image preview to set the focal focus coordinates. The storefront background positioning will dynamically scale around this center point.
      </p>

      {/* Interactive Crop Image Frame */}
      <div
        ref={containerRef}
        onClick={handleImageClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '260px',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'crosshair',
          border: '1.5px dashed rgba(255, 255, 255, 0.15)',
          background: '#0B0F19'
        }}
      >
        <img
          src={imageUrl}
          alt="Salient Crop Preview"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            userSelect: 'none',
            opacity: 0.8
          }}
        />

        {/* Dynamic Focal Target Ring */}
        <div
          style={{
            position: 'absolute',
            left: `${focalPoint.x}%`,
            top: `${focalPoint.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2.5px solid #10B981',
            boxShadow: '0 0 12px #10B981, inset 0 0 4px #10B981',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'left 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)'
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981'
            }}
          />
        </div>
      </div>

      {/* Information Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          fontSize: '12px',
          color: '#9CA3AF'
        }}
      >
        <div>
          Focus Position:{' '}
          <span style={{ color: '#10B981', fontWeight: 600 }}>
            X: {focalPoint.x}%, Y: {focalPoint.y}%
          </span>
        </div>
        <button
          onClick={triggerSave}
          style={{
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)',
            transition: 'transform 0.1s ease'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Confirm Focal Selection
        </button>
      </div>
    </div>
  )
}

import { Button } from '@affine/component';
import { AppModeService } from '@affine/core/modules/app-mode/service';
import { FrameIcon, TocIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { useState } from 'react';

function Tile({
  title,
  description,
  icon,
  onContinue,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onContinue: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onContinue();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: '1px solid var(--affine-border-color)',
        borderRadius: 14,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.03)' : 'transparent',
        boxShadow: hover
          ? '0 8px 24px rgba(0,0,0,0.25)'
          : '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'box-shadow 120ms ease, background 120ms ease',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            display: 'inline-flex',
            color: 'var(--affine-text-secondary-color)',
          }}
        >
          {icon}
        </span>
        <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      </div>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{description}</p>
      <div style={{ marginTop: 'auto' }}>
        <Button onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}

export function AppModeOnboarding() {
  const appMode = useService(AppModeService);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(1200px, 100%)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        <Tile
          title="Whiteboard (kiosk)"
          description="Large touch screens, simple edgeless canvas, local-first."
          icon={<FrameIcon />}
          onContinue={() => {
            appMode.setPreferredMode('whiteboard');
            const id = nanoid();
            location.href = `/board/${id}`;
          }}
        />
        <Tile
          title="Regular (desktop)"
          description="Full AFFiNE experience with workspaces, sidebar, and features."
          icon={<TocIcon />}
          onContinue={() => {
            appMode.setPreferredMode('regular');
            location.href = '/';
          }}
        />
      </div>
    </div>
  );
}

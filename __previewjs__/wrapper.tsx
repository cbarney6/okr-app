import React from 'react';
import '../src/app/globals.css';

interface WrapperProps {
  children: React.ReactNode;
}

export function Wrapper({ children }: WrapperProps) {
  // Mock Next.js environment variables that might be undefined
  if (typeof window !== 'undefined') {
    // Ensure process.env exists in browser context
    (window as any).process = { env: {} };
  }
  
  return (
    <div style={{ padding: '20px' }}>
      {children}
    </div>
  );
}
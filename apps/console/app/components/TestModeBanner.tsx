'use client';

export function TestModeBanner() {
  const networkName = process.env.NEXT_PUBLIC_NETWORK_NAME || 'Base Sepolia';
  
  return (
    <div className="test-mode-banner">
      🚨 TEST MODE – {networkName} 🚨
    </div>
  );
}




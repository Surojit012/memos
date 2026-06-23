import React from 'react';

export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 127 138" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="121" y1="19.4853" x2="8.48528" y2="132" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <line x1="120" y1="132" x2="9.00001" y2="132" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <circle cx="61.5" cy="115.5" r="10.5" fill="#ABD1C6"/>
      <circle cx="88.5" cy="115.5" r="10.5" fill="#ABD1C6"/>
      <circle cx="115.5" cy="115.5" r="10.5" fill="#ABD1C6"/>
      <circle cx="106.5" cy="10.5" r="10.5" fill="#ABD1C6"/>
    </svg>
  );
}

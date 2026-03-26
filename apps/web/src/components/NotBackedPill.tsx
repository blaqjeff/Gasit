import React from 'react';

export function NotBackedPill() {
  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container-low/10 backdrop-blur-xl hover:border-primary/40 hover:bg-surface-container-low/20 transition-all cursor-default group select-none">
      <div className="w-[18px] h-[18px] rounded-sm bg-gradient-to-br from-[#9945FF] via-[#14F195] to-[#14F195] flex items-center justify-center p-[3px] shadow-sm group-hover:shadow-[#14F195]/20 transition-all">
        <svg 
          viewBox="0 0 400 320" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-full h-full brightness-[1.2]"
        >
          <path d="M64.6 237.9c2.4 2.4 5.7 3.7 9.2 3.7h306.4c5.2 0 7.7-6.3 4-10l-64.6-64.6c-2.4-2.4-5.7-3.7-9.2-3.7H44c-5.2 0-7.7 6.3-4 10l64.6 64.6z" fill="white" />
          <path d="M64.6 73.9c2.4 2.4 5.7 3.7 9.2 3.7h306.4c5.2 0 7.7-6.3 4-10L319.6 3c-2.4-2.4-5.7-3.7-9.2-3.7H44c-5.2 0-7.7 6.3-4 10l64.6 64.6z" fill="white" />
          <path d="M323.4 155.9c-2.4-2.4-5.7-3.7-9.2-3.7H7.8c-5.2 0-7.7 6.3-4 10l64.6 64.6c2.4 2.4 5.7 3.7 9.2 3.7h306.4c5.2 0 7.7-6.3 4-10l-64.6-64.6z" fill="white" />
        </svg>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant group-hover:text-primary transition-colors duration-300">
        not backed by solana foundation
      </span>
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
  mood?: 'happy' | 'listening' | 'confused' | 'excited';
  className?: string;
}

const Mascot: React.FC<MascotProps> = ({ mood = 'happy', className = '' }) => {
  // Simple SVG composition for a dog
  return (
    <div className={`relative ${className}`}>
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-xl"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1, rotate: mood === 'listening' ? [0, -5, 5, 0] : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      >
        {/* Head */}
        <circle cx="100" cy="100" r="60" fill="#E07A5F" />
        
        {/* Ears - Wiggle animation if listening */}
        <motion.path
          d="M50 70 C 30 50, 30 110, 55 100"
          fill="#3D405B"
          animate={mood === 'listening' ? { rotate: [-10, 0, -10] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <motion.path
          d="M150 70 C 170 50, 170 110, 145 100"
          fill="#3D405B"
          animate={mood === 'listening' ? { rotate: [10, 0, 10] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
        />

        {/* Snout */}
        <ellipse cx="100" cy="115" rx="25" ry="18" fill="#F4F1DE" />
        <circle cx="100" cy="110" r="8" fill="#3D405B" />

        {/* Eyes */}
        <motion.g
           animate={mood === 'confused' ? { y: [0, -2, 0] } : {}}
           transition={{ repeat: Infinity, duration: 2 }}
        >
          <circle cx="80" cy="90" r="6" fill="#3D405B" />
          <circle cx="120" cy="90" r="6" fill="#3D405B" />
          {/* Shine */}
          <circle cx="82" cy="88" r="2" fill="white" />
          <circle cx="122" cy="88" r="2" fill="white" />
        </motion.g>

        {/* Mouth */}
        {mood === 'happy' && (
          <path d="M90 125 Q 100 135, 110 125" fill="none" stroke="#3D405B" strokeWidth="3" strokeLinecap="round" />
        )}
        {mood === 'listening' && (
          <circle cx="100" cy="128" r="5" fill="#3D405B" />
        )}
        {mood === 'excited' && (
           <path d="M90 125 Q 100 140, 110 125 Z" fill="#E76F51" />
        )}
      </motion.svg>
    </div>
  );
};

export default Mascot;
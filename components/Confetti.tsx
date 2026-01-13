import React, { useState, useEffect } from 'react';

interface Particle {
  id: number;
  left: string;
  animationDuration: string;
  animationDelay: string;
  backgroundColor: string;
}

const Confetti: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF'];
    const count = 100;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        left: Math.random() * 100 + 'vw',
        animationDuration: Math.random() * 3 + 2 + 's',
        animationDelay: Math.random() * 2 + 's',
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.backgroundColor,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;

import React, { useEffect, useRef } from 'react';

const Waveform: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);

      for (let i = 0; i < canvas.width; i++) {
        // Create a wobbly wave that changes over time
        const y =
          canvas.height / 2 +
          Math.sin(i * 0.05 + t) * 20 * Math.sin(t * 0.5) +
          Math.sin(i * 0.02 + t * 2) * 10;
        ctx.lineTo(i, y);
      }

      ctx.strokeStyle = '#E07A5F';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      t += 0.2;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className="w-full h-24"
    />
  );
};

export default Waveform;
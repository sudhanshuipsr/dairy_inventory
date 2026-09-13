import React, { useEffect, useState, useRef } from 'react';

/**
  * AnimatedCounter component: smoothly ticks numbers from 0 to target value on load/change.
  */
const AnimatedCounter = ({
  value = 0,
  duration = 800,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const targetNum = Number(value) || 0;
  const prevTargetRef = useRef(0);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = prevTargetRef.current;
    const change = targetNum - startValue;

    if (change === 0) {
      setDisplayValue(targetNum);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + change * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prevTargetRef.current = targetNum;
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetNum, duration]);

  const formatted = decimals > 0 
    ? displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

export default AnimatedCounter;

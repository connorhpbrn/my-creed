"use client";

import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@creed/ui/utils";

export interface LogInIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LogInIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LogInIcon = forwardRef<LogInIconHandle, LogInIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) onMouseEnter?.(event);
        else controls.start("animate");
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) onMouseLeave?.(event);
        else controls.start("normal");
      },
      [controls, onMouseLeave],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <motion.path
            animate={controls}
            d="m10 17 5-5-5-5"
            variants={{
              normal: { x: 0 },
              animate: {
                x: 1.8,
                transition: { type: "spring", stiffness: 280, damping: 22 },
              },
            }}
          />
          <motion.path
            animate={controls}
            d="M15 12H3"
            variants={{
              normal: { x: 0 },
              animate: {
                x: 1.8,
                transition: { type: "spring", stiffness: 280, damping: 22 },
              },
            }}
          />
        </svg>
      </div>
    );
  },
);

LogInIcon.displayName = "LogInIcon";

export { LogInIcon };

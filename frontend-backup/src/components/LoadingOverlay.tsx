import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Clock, Download, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: { current: number; total: number } | null;
  startTime?: number | null;
}

export const LoadingOverlay = ({
  isVisible,
  message = "Processando...",
  progress = null,
  startTime = null
}: LoadingOverlayProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isVisible || !startTime) {
      setElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0;
  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-lg"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="bg-card border border-border rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4"
        >
          <div className="flex flex-col items-center gap-6">
            {/* Animated Icon */}
            <div className="relative">
              {/* Pulsing background */}
              <motion.div
                className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* Rotating ring */}
              <motion.div
                className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary relative"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Download className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Message */}
            <div className="text-center space-y-2">
              <motion.p
                className="text-lg text-foreground font-semibold"
                key={message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {message}
              </motion.p>

              {/* Elapsed Time */}
              {startTime && (
                <motion.div
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Clock className="h-4 w-4" />
                  <span className="font-mono tabular-nums">{seconds}s</span>
                </motion.div>
              )}
            </div>

            {/* Progress Bar */}
            {progress && (
              <motion.div
                className="w-full space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Progress info */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Item {progress.current} de {progress.total}
                  </span>
                  <span className="text-primary font-bold tabular-nums">
                    {Math.round(progressPercent)}%
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-muted" />

                  {/* Progress fill */}
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />

                  {/* Animated shimmer effect */}
                  <motion.div
                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: [-80, 400] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 0.5
                    }}
                  />
                </div>

                {/* Step indicators */}
                <div className="flex justify-between px-1">
                  {Array.from({ length: Math.min(progress.total, 5) }).map((_, i) => {
                    const stepIndex = progress.total <= 5 ? i : Math.floor((i / 4) * (progress.total - 1));
                    const isCompleted = progress.current > stepIndex;
                    const isCurrent = progress.current === stepIndex + 1;

                    return (
                      <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          isCompleted
                            ? 'bg-primary'
                            : isCurrent
                              ? 'bg-primary/50'
                              : 'bg-muted-foreground/30'
                        }`}
                        animate={isCurrent ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0 }}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Indeterminate animation when no progress */}
            {!progress && (
              <motion.div className="w-full">
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
                    animate={{ x: ["-100%", "400%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

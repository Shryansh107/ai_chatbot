import { motion } from 'framer-motion';
import { useCallback } from 'react';

interface OverviewProps {
  setInput: (text: string) => void;
}

export const Overview = ({ setInput }: OverviewProps) => {
  const handleOptionClick = useCallback((text: string) => {
    setInput(text);
  }, [setInput]);

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Welcome to your Resume Builder!</h1>
        <p className="text-muted-foreground mb-4">
          I can help you create an ATS-friendly resume. Try asking:
        </p>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => handleOptionClick("Help me format my work experience section")}
            className="p-4 text-left rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            "Help me format my work experience section"
          </button>
          <button
            type="button"
            onClick={() => handleOptionClick("What skills should I include for a software developer role?")}
            className="p-4 text-left rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            "What skills should I include for a software developer role?"
          </button>
          <button
            type="button"
            onClick={() => handleOptionClick("How can I make my resume more ATS-friendly?")}
            className="p-4 text-left rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            "How can I make my resume more ATS-friendly?"
          </button>
          <button
            type="button"
            onClick={() => handleOptionClick("Create a resume for a software engineer")}
            className="p-4 text-left rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            "Create a resume for a software engineer"
          </button>
        </div>
      </div>
    </motion.div>
  );
};

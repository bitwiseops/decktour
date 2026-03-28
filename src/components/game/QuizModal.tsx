"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/lib/types";
import { QUIZ_CORRECT_BONUS } from "@/lib/scoring";

interface QuizModalProps {
  questions: QuizQuestion[];
  onComplete: (answers: number[], correct: number) => void;
  onClose: () => void;
}

export function QuizModal({ questions, onComplete, onClose }: QuizModalProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[currentQ];

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);

    const isCorrect = answerIndex === question.correctIndex;
    if (isCorrect) setCorrect((c) => c + 1);

    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ((q) => q + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        setFinished(true);
      }
    }, 2000);
  };

  const finalCorrect = finished ? answers.filter((a, i) => a === questions[i]?.correctIndex).length : correct;

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="glass rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4"
        >
          <Trophy size={48} className="text-accent" />
          <h2 className="text-2xl font-bold">Quiz completato!</h2>
          <p className="text-foreground/60">
            {finalCorrect} su {questions.length} risposte corrette
          </p>
          <p className="text-lg font-semibold text-success">
            +{finalCorrect * QUIZ_CORRECT_BONUS} punti
          </p>
          <button
            onClick={() => onComplete(answers, finalCorrect)}
            className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors w-full"
          >
            Continua
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 flex flex-col p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-foreground/60">
          Domanda {currentQ + 1} di {questions.length}
        </span>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
          <X size={20} />
        </button>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 rounded-full bg-white/10 mb-8">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 flex flex-col gap-6"
        >
          <h2 className="text-xl font-bold">{question.question}</h2>

          <div className="flex flex-col gap-3">
            {question.options.map((option, i) => {
              let bg = "bg-white/5 hover:bg-white/10 border-glass-border";
              if (showFeedback) {
                if (i === question.correctIndex) bg = "bg-success/20 border-success";
                else if (i === selectedAnswer) bg = "bg-danger/20 border-danger";
              }
              return (
                <motion.button
                  key={i}
                  whileTap={!showFeedback ? { scale: 0.98 } : undefined}
                  onClick={() => handleAnswer(i)}
                  disabled={showFeedback}
                  className={`p-4 rounded-xl border text-left transition-all ${bg}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-medium shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm">{option}</span>
                    {showFeedback && i === question.correctIndex && <CheckCircle size={18} className="text-success ml-auto shrink-0" />}
                    {showFeedback && i === selectedAnswer && i !== question.correctIndex && <XCircle size={18} className="text-danger ml-auto shrink-0" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 rounded-xl bg-white/5 border border-glass-border"
              >
                <p className="text-sm text-foreground/70">{question.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Score */}
      <div className="mt-4 text-center text-sm text-foreground/50">
        Punteggio: <span className="text-success font-medium">{correct * QUIZ_CORRECT_BONUS}</span>
      </div>
    </motion.div>
  );
}

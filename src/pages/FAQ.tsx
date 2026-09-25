import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const faqs = [
  {
    q: "What is Machine Learning?",
    a: "Machine learning is a subset of artificial intelligence that involves the use of algorithms and statistical models to enable computers to perform a specific task without using explicit instructions, relying on patterns and inference instead."
  },
  {
    q: "Why use K-Nearest Neighbors (KNN)?",
    a: "KNN is an intuitive, instance-based learning algorithm. It classifies a new data point based on the majority class among its 'k' closest neighbors in the feature space. For datasets like the Sonar dataset, it effectively models the nonlinear boundaries between Rock and Mine frequency signatures."
  },
  {
    q: "What is the difference between Accuracy and F1-Score?",
    a: "Accuracy is the ratio of correctly predicted observations to the total observations. F1-Score is the harmonic mean of Precision and Recall. F1-Score is often a better metric than Accuracy in situations where False Positives and False Negatives carry different costs or if the dataset is imbalanced."
  },
  {
    q: "How do I interpret the Confusion Matrix?",
    a: "A confusion matrix shows actual vs. predicted classifications. True Positives (Mines correctly identified) and True Negatives (Rocks correctly identified) are on the main diagonal. False Positives (Rocks misclassified as Mines) and False Negatives (Mines misclassified as Rocks) are the errors. In naval defense, minimizing False Negatives is critical."
  },
  {
    q: "What does the confidence score mean?",
    a: "The confidence score represents the model's certainty in its prediction. In KNN, if k=3 and 2 neighbors are 'Mine' and 1 is 'Rock', the prediction is 'Mine' with 66.7% confidence (2/3)."
  }
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4 pt-8 pb-4">
        <h1 className="text-4xl font-bold text-white">Help & FAQ</h1>
        <p className="text-lg text-slate-400">Common questions about the Echo-Guard model and machine learning concepts.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div 
            key={idx} 
            className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-green-400/50"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none hover:bg-white/5 transition-colors"
            >
              <span className="font-bold text-white">{faq.q}</span>
              <ChevronDown 
                className={cn(
                  "text-slate-400 transition-transform duration-300",
                  openIdx === idx ? "rotate-180 text-cyan-400" : ""
                )} 
                size={20} 
              />
            </button>
            <div 
              className={cn(
                "px-6 overflow-hidden transition-all duration-300 ease-in-out",
                openIdx === idx ? "max-h-96 pb-5 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <p className="text-slate-300 leading-relaxed border-t border-white/10 pt-4">
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

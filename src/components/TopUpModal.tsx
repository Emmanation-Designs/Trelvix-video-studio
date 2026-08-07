import React, { useState } from 'react';
import { X, Zap, Check, Sparkles } from 'lucide-react';
import { authFetch } from '../lib/api';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCredits: (amount: number) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  onAddCredits
}) => {
  if (!isOpen) return null;

  const [selectedPlan, setSelectedPlan] = useState<number>(100);
  const [purchased, setPurchased] = useState(false);

  const plans = [
    { credits: 40, price: '$4.99', popular: false },
    { credits: 100, price: '$9.99', popular: true },
    { credits: 220, price: '$19.99', popular: false },
    { credits: 500, price: '$39.99', popular: false }
  ];

  const handlePurchase = async () => {
    setPurchased(true);
    try {
      const res = await authFetch('/api/video-studio/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPlan === 40 ? 'pkg-starter' : selectedPlan === 100 ? 'pkg-creator' : selectedPlan === 220 ? 'pkg-studio' : 'pkg-pro-studio',
        })
      });
      const data = await res.json();
      if (data.remainingCredits !== undefined) {
        onAddCredits(selectedPlan);
      } else {
        onAddCredits(selectedPlan);
      }
    } catch {
      onAddCredits(selectedPlan);
    }
    setTimeout(() => {
      setPurchased(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-6">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mx-auto flex items-center justify-center">
            <Zap className="w-6 h-6 fill-emerald-500/30" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Top Up Generation Credits
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Refill your studio balance to continue rendering 4K high-definition scenes.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-2 gap-3">
          {plans.map((p) => (
            <button
              key={p.credits}
              onClick={() => setSelectedPlan(p.credits)}
              className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPlan === p.credits
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md'
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold uppercase">
                  Popular
                </span>
              )}
              <div className="flex items-center gap-1 font-black text-base">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span>{p.credits.toLocaleString()}</span>
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">
                {p.price}
              </p>
            </button>
          ))}
        </div>

        {/* Purchase CTA */}
        <button
          onClick={handlePurchase}
          disabled={purchased}
          className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          {purchased ? (
            <>
              <Check className="w-4 h-4" />
              <span>Added {selectedPlan} Credits!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Confirm & Add Credits</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
};

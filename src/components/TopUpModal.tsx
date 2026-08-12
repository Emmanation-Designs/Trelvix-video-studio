import React, { useState } from 'react';
import { X, Zap, Sparkles, Plus, Minus, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { authFetch } from '../lib/api';
import { AUTHORITATIVE_PACKAGES } from './BillingPage';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCredits: (amount: number) => void;
  onOpenBilling?: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  onAddCredits,
  onOpenBilling
}) => {
  if (!isOpen) return null;

  // Default to 1,000 credits (index 10 in 19-package ladder)
  const [pkgIndex, setPkgIndex] = useState<number>(10);
  const selectedPackage = AUTHORITATIVE_PACKAGES[pkgIndex];
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePrevPkg = () => {
    setPkgIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextPkg = () => {
    setPkgIndex((prev) => Math.min(AUTHORITATIVE_PACKAGES.length - 1, prev + 1));
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const orderRes = await authFetch('/api/video-studio/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          credits: selectedPackage.credits
        })
      });
      const orderData = await orderRes.json();
      if (orderData.success && orderData.orderId) {
        const captureRes = await authFetch('/api/video-studio/payments/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderId,
            packageId: selectedPackage.id,
          })
        });
        const capData = await captureRes.json();
        if (capData.success) {
          setPurchased(true);
          onAddCredits(capData.creditsAdded || selectedPackage.credits);
          setTimeout(() => {
            setPurchased(false);
            onClose();
          }, 1200);
        } else {
          onAddCredits(selectedPackage.credits);
          onClose();
        }
      } else {
        onAddCredits(selectedPackage.credits);
        onClose();
      }
    } catch {
      onAddCredits(selectedPackage.credits);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-100">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center">
            <Zap className="w-6 h-6 fill-emerald-400/20" />
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white">
            Top Up Video Credits
          </h3>
          <p className="text-xs text-zinc-400">
            Adjust your credit package amount below to refill your wallet.
          </p>
        </div>

        {/* SINGLE PACKAGE STEPPER CONTROL: − [credits] + */}
        <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevPkg}
              disabled={pkgIndex === 0}
              className="w-12 h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-100 text-xl font-black flex items-center justify-center transition-all cursor-pointer border border-zinc-700/60 shrink-0"
              title="Decrease credits"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center px-4">
              <div className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400/20 shrink-0" />
                <span>{selectedPackage.credits.toLocaleString()}</span>
              </div>
              {(selectedPackage.badge || selectedPackage.bestValue) && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-400 text-black text-[9px] font-black uppercase tracking-wider shadow">
                  {selectedPackage.badge || 'Best Value'}
                </span>
              )}
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                Credits
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextPkg}
              disabled={pkgIndex === AUTHORITATIVE_PACKAGES.length - 1}
              className="w-12 h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-zinc-100 text-xl font-black flex items-center justify-center transition-all cursor-pointer border border-zinc-700/60 shrink-0"
              title="Increase credits"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Package Details Banner */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-400 font-semibold block">Price</span>
              <span className="text-lg font-black text-emerald-400">${selectedPackage.priceUsd.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 font-semibold block">Yield</span>
              <span className="text-xs font-bold text-white">≈ {selectedPackage.soraGens} Sora 2 clips</span>
            </div>
          </div>
        </div>

        {/* Purchase CTA */}
        <div className="space-y-3">
          <button
            onClick={handlePurchase}
            disabled={purchased || loading}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {purchased ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-black" />
                <span>Added +{selectedPackage.credits.toLocaleString()} Credits!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Top Up {selectedPackage.credits.toLocaleString()} Credits (${selectedPackage.priceUsd.toFixed(2)})</span>
              </>
            )}
          </button>

          {onOpenBilling && (
            <button
              onClick={() => {
                onClose();
                onOpenBilling();
              }}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs transition-colors border border-zinc-800 cursor-pointer"
            >
              View Full Billing & Transaction History
            </button>
          )}
        </div>

        <p className="text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Encrypted PayPal REST API • Credits never expire
        </p>

      </div>

    </div>
  );
};

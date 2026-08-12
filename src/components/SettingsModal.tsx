import React, { useState, useEffect } from 'react';
import { authFetch } from '../lib/api';
import { AUTHORITATIVE_PACKAGES } from './BillingPage';
import {
  X,
  Zap,
  Check,
  Sparkles,
  CreditCard,
  History,
  Settings as SettingsIcon,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Info,
  Sliders,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  estimatedGenerations: number;
  active: boolean;
}

interface TransactionItem {
  id: string;
  type: 'PURCHASE' | 'USAGE' | 'REFUND' | 'ADJUSTMENT';
  credits: number;
  amount: number;
  currency: string;
  status: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  createdAt: string;
  metadata?: any;
}

interface WalletData {
  balance: number;
  lifetimeCreditsPurchased: number;
  lifetimeCreditsUsed: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onCreditsUpdated: (newBalance: number) => void;
  defaultTab?: 'billings' | 'support' | 'general';
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSupport?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentCredits,
  onCreditsUpdated,
  defaultTab = 'billings',
  isDarkMode,
  onToggleTheme,
  onOpenSupport,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'billings' | 'support' | 'general'>(
    defaultTab === 'general' ? 'general' : defaultTab === 'support' ? 'support' : 'billings'
  );

  // Data states
  const [wallet, setWallet] = useState<WalletData>({
    balance: currentCredits,
    lifetimeCreditsPurchased: 0,
    lifetimeCreditsUsed: 0,
  });
  const defaultPackagesList: CreditPackage[] = AUTHORITATIVE_PACKAGES.map((p) => ({
    id: p.id,
    name: p.name,
    credits: p.credits,
    priceUsd: p.priceUsd,
    estimatedGenerations: p.soraGens,
    active: true,
  }));

  const [packages, setPackages] = useState<CreditPackage[]>(defaultPackagesList);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(
    defaultPackagesList.find((p) => p.credits === 1000) || defaultPackagesList[defaultPackagesList.length - 1]
  );

  // Status & Loading states
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string>('test');

  // Load Wallet and Credit Packages
  const fetchWalletAndPackages = async () => {
    setLoadingPackages(true);
    try {
      // 1. Fetch Credits
      const credRes = await authFetch('/api/video-studio/credits');
      const credData = await credRes.json();
      if (credData.success && credData.wallet) {
        setWallet(credData.wallet);
        onCreditsUpdated(credData.wallet.balance);
      }

      // 2. Fetch Packages
      const pkgRes = await authFetch('/api/video-studio/credit-packages');
      const pkgData = await pkgRes.json();
      if (pkgData.success && pkgData.packages) {
        setPackages(pkgData.packages);
        if (pkgData.packages.length > 0 && !selectedPackage) {
          // Default select 1,000 Credits package (Best Value)
          const defaultPkg = pkgData.packages.find((p: CreditPackage) => p.credits === 1000) || pkgData.packages[pkgData.packages.length - 1] || pkgData.packages[0];
          setSelectedPackage(defaultPkg);
        }
      }

      // 3. Health check for PayPal Client ID
      const healthRes = await authFetch('/api/health');
      const healthData = await healthRes.json();
      if (healthData.paypalConfigured) {
        // Retrieve client id if available in env or set fallback client id
        setPaypalClientId((import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || 'sb');
      }
    } catch (err) {
      console.error('Failed fetching wallet or packages:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Load Transaction History
  const fetchTransactionHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await authFetch('/api/video-studio/payments/history');
      const data = await res.json();
      if (data.success && data.history) {
        setTransactions(data.history);
      }
    } catch (err) {
      console.error('Failed fetching transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchWalletAndPackages();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchTransactionHistory();
    }
  }, [activeTab]);

  // PayPal Create Order callback
  const handleCreateOrder = async () => {
    if (!selectedPackage) throw new Error('Please select a credit package.');
    setProcessingPayment(true);
    setPaymentErrorMsg(null);
    setPaymentSuccessMsg(null);

    try {
      const res = await authFetch('/api/video-studio/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });
      const data = await res.json();
      if (!data.success || !data.orderId) {
        throw new Error(data.error || 'Failed creating PayPal order');
      }
      return data.orderId;
    } catch (err: any) {
      setProcessingPayment(false);
      setPaymentErrorMsg(err.message || 'Error creating PayPal order.');
      throw err;
    }
  };

  // PayPal Approve/Capture callback
  const handleApproveOrder = async (data: { orderID: string }) => {
    if (!selectedPackage) return;
    setProcessingPayment(true);

    try {
      const res = await authFetch('/api/video-studio/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderID,
          packageId: selectedPackage.id,
        }),
      });
      const captureData = await res.json();

      if (!captureData.success) {
        throw new Error(captureData.error || 'Payment capture failed.');
      }

      setPaymentSuccessMsg(`Payment successful! +${captureData.creditsAdded} Credits added to your Video Studio wallet.`);
      onCreditsUpdated(captureData.newBalance);
      setWallet((prev) => ({
        ...prev,
        balance: captureData.newBalance,
        lifetimeCreditsPurchased: prev.lifetimeCreditsPurchased + captureData.creditsAdded,
      }));

      // Refresh transaction history
      fetchTransactionHistory();
    } catch (err: any) {
      console.error('Error in handleApproveOrder:', err);
      setPaymentErrorMsg(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Settings</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage your Video Studio billings, support, and general preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container with Sidebar & Main Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation Sidebar: EXACTLY 3 BUTTONS (Billings, Support, General Settings) */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 p-3 space-y-1.5 bg-zinc-50/30 dark:bg-zinc-900/20 shrink-0 flex md:flex-col overflow-x-auto md:overflow-x-visible">
            
            <button
              onClick={() => setActiveTab('billings')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'billings'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Billings</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'support'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Support</span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'general'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>General Settings</span>
            </button>

          </div>

          {/* Tab Main Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* TAB 1: BILLINGS (EVERYTHING ABOUT PRICING & PACKAGES) */}
            {activeTab === 'billings' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                
                {/* Stats Header Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Current Credit Balance
                    </span>
                    <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                      <span>{wallet.balance.toLocaleString()} Credits</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Lifetime Purchased
                    </span>
                    <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                      +{wallet.lifetimeCreditsPurchased.toLocaleString()} Credits
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                      Lifetime Used
                    </span>
                    <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                      {wallet.lifetimeCreditsUsed.toLocaleString()} Credits
                    </div>
                  </div>
                </div>

                {/* Notifications / Alerts */}
                {paymentSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between animate-in zoom-in-95">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>{paymentSuccessMsg}</span>
                    </div>
                    <button onClick={() => setPaymentSuccessMsg(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {paymentErrorMsg && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between animate-in zoom-in-95">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{paymentErrorMsg}</span>
                    </div>
                    <button onClick={() => setPaymentErrorMsg(null)} className="p-1 hover:bg-red-500/20 rounded-lg cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Adjustable Credit Package Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-500" />
                        Select Credit Amount & Package Pricing
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Adjust package tier using the stepper below.
                      </p>
                    </div>

                    <button
                      onClick={fetchWalletAndPackages}
                      className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Refresh Packages"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingPackages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const currentIdx = packages.findIndex(p => p.id === selectedPackage?.id);
                          if (currentIdx > 0) setSelectedPackage(packages[currentIdx - 1]);
                        }}
                        disabled={!selectedPackage || packages.findIndex(p => p.id === selectedPackage?.id) <= 0}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold text-lg text-zinc-800 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                      >
                        −
                      </button>

                      <div className="text-center px-4">
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5">
                          <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500/30" />
                          <span>{selectedPackage?.credits.toLocaleString() || 0} Credits</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mt-0.5">
                          ${selectedPackage?.priceUsd.toFixed(2) || '0.00'} USD • ≈ {selectedPackage?.estimatedGenerations || 0} Sora 2 clips
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const currentIdx = packages.findIndex(p => p.id === selectedPackage?.id);
                          if (currentIdx < packages.length - 1) setSelectedPackage(packages[currentIdx + 1]);
                        }}
                        disabled={!selectedPackage || packages.findIndex(p => p.id === selectedPackage?.id) >= packages.length - 1}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-bold text-lg text-zinc-800 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* PayPal Checkout Area */}
                {selectedPackage && (
                  <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider">
                          Checkout Summary
                        </span>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {selectedPackage.name} Package — {selectedPackage.credits} Credits
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-400 block">Total Due (USD)</span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                          ${selectedPackage.priceUsd.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* PayPal Buttons Integration */}
                    <div className="max-w-md mx-auto py-2">
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalClientId,
                          currency: 'USD',
                          intent: 'capture',
                        }}
                      >
                        <PayPalButtons
                          style={{
                            layout: 'vertical',
                            color: 'gold',
                            shape: 'rect',
                            label: 'pay',
                          }}
                          disabled={processingPayment}
                          createOrder={handleCreateOrder}
                          onApprove={handleApproveOrder}
                          onError={(err) => {
                            console.error('PayPal Button Error:', err);
                            setPaymentErrorMsg('PayPal Checkout was interrupted or encountered an error.');
                            setProcessingPayment(false);
                          }}
                          onCancel={() => {
                            setProcessingPayment(false);
                          }}
                        />
                      </PayPalScriptProvider>
                    </div>

                    <p className="text-[10px] text-center text-zinc-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Encrypted PayPal REST API Checkout. No secrets exposed to browser.
                    </p>
                  </div>
                )}

                {/* Transaction Ledger Table in Billings */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      Credit & Billing Transaction Ledger
                    </h3>
                    <button
                      onClick={fetchTransactionHistory}
                      className="p-1 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        No transactions recorded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 uppercase tracking-wider font-bold border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Credits</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                              <td className="p-3 font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleString()}
                              </td>
                              <td className="p-3 font-bold uppercase text-[10px]">
                                <span
                                  className={`px-2 py-0.5 rounded-full ${
                                    tx.type === 'PURCHASE'
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : tx.type === 'REFUND'
                                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="p-3 font-black">
                                <span className={tx.credits > 0 ? 'text-emerald-500' : 'text-zinc-400'}>
                                  {tx.credits > 0 ? `+${tx.credits}` : tx.credits} Credits
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
                                {tx.amount > 0 ? `$${tx.amount.toFixed(2)} ${tx.currency}` : '—'}
                              </td>
                              <td className="p-3 font-bold text-[10px]">
                                <span
                                  className={`px-2 py-0.5 rounded-md ${
                                    tx.status === 'COMPLETED'
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : 'bg-amber-500/10 text-amber-500'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: SUPPORT */}
            {activeTab === 'support' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        Trelvix AI Video Studio Support
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Need assistance with video generations, billing, or technical queries?
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Our support team is ready to assist you. All video generation credit reservations are protected with instant zero-cost auto-refunds on any provider or network failure.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (onOpenSupport) {
                          onOpenSupport();
                        } else {
                          window.open('https://trelvixai.com/support', '_blank');
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Support Page (trelvixai.com/support)</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Quick Help & Guidelines
                  </h4>
                  <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400 list-disc pl-4">
                    <li>Failed video generations automatically refund reserved credits immediately.</li>
                    <li>Sora 2 Creative engine cost is calculated based on resolution, duration, and batch count before generation.</li>
                    <li>Purchased credit packages do not expire and remain in your Video Studio wallet.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 3: GENERAL SETTINGS (MODE SWITCH ONLY) */}
            {activeTab === 'general' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  General Settings
                </h3>

                <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Appearance Mode Switch</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Toggle between Dark Mode and Light Mode</p>
                    </div>
                    <button
                      onClick={onToggleTheme}
                      className="px-4 py-2 rounded-2xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      {isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

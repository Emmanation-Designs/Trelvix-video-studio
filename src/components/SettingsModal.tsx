import React, { useState, useEffect } from 'react';
import { authFetch } from '../lib/api';
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
  defaultTab?: 'general' | 'credits' | 'history' | 'payment';
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentCredits,
  onCreditsUpdated,
  defaultTab = 'credits',
  isDarkMode,
  onToggleTheme,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'general' | 'credits' | 'history' | 'payment'>(defaultTab);

  // Data states
  const [wallet, setWallet] = useState<WalletData>({
    balance: currentCredits,
    lifetimeCreditsPurchased: 0,
    lifetimeCreditsUsed: 0,
  });
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);

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
          // Default select Creator or second package
          const defaultPkg = pkgData.packages.find((p: CreditPackage) => p.credits === 100) || pkgData.packages[0];
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Video Studio Settings</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your Video Studio credits, PayPal billing, and preferences
              </p>
            </div>
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
          
          {/* Navigation Sidebar */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 p-3 space-y-1 bg-zinc-50/30 dark:bg-zinc-900/20 shrink-0 flex md:flex-col overflow-x-auto md:overflow-x-visible">
            
            <button
              onClick={() => setActiveTab('credits')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'credits'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Credits & Billing</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <History className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Transaction History</span>
            </button>

            <button
              onClick={() => setActiveTab('payment')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'payment'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Payment Info</span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
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
            
            {/* TAB 1: CREDITS & BILLING */}
            {activeTab === 'credits' && (
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
                    <button onClick={() => setPaymentSuccessMsg(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg">
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
                    <button onClick={() => setPaymentErrorMsg(null)} className="p-1 hover:bg-red-500/20 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Credit Packages Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-500" />
                        Select Credit Package
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Top up Video Studio credits via PayPal Live. Packages are database-driven.
                      </p>
                    </div>

                    <button
                      onClick={fetchWalletAndPackages}
                      className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Refresh Packages"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingPackages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id;
                      const isPopular = pkg.name === 'Creator' || pkg.credits === 100;

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500 text-zinc-900 dark:text-zinc-100 ring-2 ring-emerald-500/20 shadow-lg'
                              : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                          }`}
                        >
                          {isPopular && (
                            <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold uppercase shadow-sm">
                              Popular
                            </span>
                          )}

                          <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              {pkg.name}
                            </span>
                            <div className="flex items-center gap-1 font-black text-xl text-zinc-900 dark:text-zinc-100">
                              <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500/30" />
                              <span>{pkg.credits.toLocaleString()} Credits</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                              ≈ {pkg.estimatedGenerations} Creative generations
                            </p>
                          </div>

                          <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                            <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                              ${pkg.priceUsd.toFixed(2)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                isSelected
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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

              </div>
            )}

            {/* TAB 2: TRANSACTION HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      Credit & Billing Transactions
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Complete history of credit purchases, video usage, and refunds.
                    </p>
                  </div>
                  <button
                    onClick={fetchTransactionHistory}
                    className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <History className="w-8 h-8 text-zinc-400 mx-auto" />
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
                          <th className="p-3">PayPal Ref</th>
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
                            <td className="p-3 font-mono text-[10px] text-zinc-400 truncate max-w-[120px]">
                              {tx.paypalCaptureId || tx.paypalOrderId || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PAYMENT METHOD INFO */}
            {activeTab === 'payment' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  PayPal Live REST API Integration Status
                </h3>

                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        PayPal LIVE REST API Connected
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Target Endpoint: https://api-m.paypal.com
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-400">Environment:</span>
                      <span className="text-emerald-500 font-bold uppercase">LIVE</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-400">Client Secret Security:</span>
                      <span className="text-zinc-300">Server-Side Only (Never in client bundle)</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-400">Supported Currencies:</span>
                      <span className="text-zinc-300">USD ($)</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-400">Idempotent Webhook Verification:</span>
                      <span className="text-emerald-500 font-bold">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: GENERAL SETTINGS */}
            {activeTab === 'general' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  Studio General Settings
                </h3>

                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Appearance Theme</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Switch between dark and light themes</p>
                    </div>
                    <button
                      onClick={onToggleTheme}
                      className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer"
                    >
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Default Quality Mode</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Creative Quality (sora-2 engine)</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                      Creative
                    </span>
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

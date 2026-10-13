// Shared wallet-transaction helpers: credit or debit, a friendly label,
// and which debits are already shown as a purchase (Order) in History.

export const CREDIT_TYPES = new Set(['FUND', 'REFUND', 'TRANSFER_IN', 'AIRTIME_CASH', 'REFERRAL_BONUS', 'CASHBACK', 'LOYALTY', 'CONTEST_PRIZE', 'COUPON', 'SAVINGS_OUT', 'INTEREST', 'CHALLENGE_REWARD', 'DELIVERY_BONUS', 'SHOP_COMMISSION', 'DISPUTE_RELEASE', 'DISPUTE_RETURN_IN', 'CIRCLE_IN', 'SPRAY_IN', 'DUES_IN', 'POT_IN', 'SAFEBUY_IN', 'PAYROLL_IN', 'REWARD']);
export const isCredit = (type) => CREDIT_TYPES.has(type);

export const TYPE_LABEL = {
  FUND: 'Wallet funded', REFUND: 'Refund', TRANSFER_IN: 'Money received', TRANSFER_OUT: 'Money sent', DEBIT: 'Purchase',
  AIRTIME_CASH: 'Airtime to Cash', REFERRAL_BONUS: 'Referral bonus', CASHBACK: 'Cashback', LOYALTY: 'Points redeemed', CONTEST_PRIZE: 'Contest prize', COUPON: 'Coupon',
  SAVINGS_IN: 'Moved to savings', SAVINGS_OUT: 'From savings', INTEREST: 'Savings interest', CHALLENGE_REWARD: 'Challenge reward', DELIVERY_BONUS: 'Delivery promise bonus', SHOP_COMMISSION: 'Shop commission',
  DISPUTE_HOLD: 'On hold (wrong transfer)', DISPUTE_RELEASE: 'Hold released', DISPUTE_RETURN_OUT: 'Returned (sent by mistake)', DISPUTE_RETURN_IN: 'Money returned to you',
  CIRCLE_OUT: 'Ajo Circle payment', CIRCLE_IN: 'Ajo Circle payout', SPRAY_OUT: 'Owambe spray', SPRAY_IN: 'Spray received', DUES_OUT: 'Dues paid', DUES_IN: 'Dues received',
  POT_OUT: 'Shared Light', POT_IN: 'Shared Light refund', SAFEBUY_OUT: 'SafeBuy payment', SAFEBUY_IN: 'SafeBuy received', PAYROLL_OUT: 'Payroll', PAYROLL_IN: 'Salary received', REWARD: 'Reward',
};
export const typeLabel = (type) => TYPE_LABEL[type] || 'Transaction';
export const txLabel = (t) => (t.type === 'FUND' ? 'Wallet funded' : t.note || typeLabel(t.type));

// Purchase debits (airtime, data… and printed cards) already appear as their
// own receipt in History, so the wallet line would be a duplicate.
export const isPurchaseDebit = (t) => t.type === 'DEBIT' && /\bpurchase\b|^Print /i.test(String(t.note || ''));

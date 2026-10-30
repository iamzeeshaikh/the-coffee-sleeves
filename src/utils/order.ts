// One price and one payment story for every surface: product pages, cards, the
// JSON-LD offer, the Merchant feed, the checkout and the order API.
//
// Owner's decisions, 2026-10-23: 100 sleeves = $30.00 with free US shipping;
// payment by PayPal invoice or bank transfer invoice after the proof is
// approved. Production starts when the invoice is paid. No cards on the site,
// no cash on delivery (the checkout does not offer it).

export const PACK_QTY = 100;
export const PACK_PRICE = 30;
export const MAX_PACKS = 50;
export const money = (n: number) => `$${n.toFixed(2)}`;
export const PACK_PRICE_TEXT = PACK_PRICE.toFixed(2);
export const PACK_LINE = `${money(PACK_PRICE)} for ${PACK_QTY} sleeves`;

/** Orders ship to the US only, free (owner 2026-10-02; US-only confirmed 2026-10-31). */
export const SHIP_COUNTRIES = [{ code: 'US', name: 'United States' }];

export type PaymentId = 'paypal' | 'bank';
export const PAYMENT_METHODS: { id: PaymentId; name: string; detail: string }[] = [
  {
    id: 'paypal',
    name: 'PayPal invoice',
    detail:
      'We email a PayPal invoice once you approve your free digital proof. Pay with your PayPal balance or any card PayPal accepts. Production starts when the invoice is paid.',
  },
  {
    id: 'bank',
    name: 'Bank transfer invoice',
    detail:
      'We email an invoice with our bank details once you approve your free digital proof. Production starts when the transfer clears.',
  },
];

import dotenv from 'dotenv';

dotenv.config();

function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const env = (process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase();
  const apiBase = env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  return { clientId, clientSecret, env, apiBase };
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtain OAuth 2.0 access token from PayPal REST API
 */
export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret, apiBase } = getPayPalConfig();

  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  if (!clientId || !clientSecret) {
    console.warn('PayPal credentials missing. Operating in fallback/development mode.');
    return 'mock_paypal_token';
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Failed to obtain PayPal access token:', errText);
    throw new Error(`PayPal OAuth Authentication Error: ${response.statusText}`);
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Create a PayPal Order server-side
 */
export async function createPayPalOrder(params: {
  packageId: string;
  packageName: string;
  credits: number;
  amountUsd: number;
  currency?: string;
}) {
  const { packageId, packageName, credits, amountUsd, currency = 'USD' } = params;
  const { clientId, clientSecret, apiBase } = getPayPalConfig();

  if (!clientId || !clientSecret) {
    // Development fallback mock order ID
    const mockOrderId = `MOCK-ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return {
      id: mockOrderId,
      status: 'CREATED',
      links: [],
      isMock: true,
    };
  }

  const accessToken = await getPayPalAccessToken();

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: packageId,
        description: `Trelvix Video Studio - ${packageName} (${credits} Credits)`,
        custom_id: packageId,
        amount: {
          currency_code: currency,
          value: amountUsd.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: amountUsd.toFixed(2),
            },
          },
        },
        items: [
          {
            name: `${packageName} Credit Pack`,
            description: `${credits} Video Studio Credits`,
            quantity: '1',
            unit_amount: {
              currency_code: currency,
              value: amountUsd.toFixed(2),
            },
            category: 'DIGITAL_GOODS',
          },
        ],
      },
    ],
    application_context: {
      brand_name: 'Trelvix AI Video Studio',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: 'https://ais-dev-k3mlgjtrjjj4z533zfmni6-706738832997.europe-west2.run.app/api/video-studio/payments/paypal/return',
      cancel_url: 'https://ais-dev-k3mlgjtrjjj4z533zfmni6-706738832997.europe-west2.run.app/api/video-studio/payments/paypal/cancel',
    },
  };

  const response = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `order-${packageId}-${Date.now()}`,
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const errorDetails = await response.json();
    console.error('PayPal Order Creation Error:', JSON.stringify(errorDetails));
    throw new Error(
      errorDetails.message || `PayPal Order Creation failed with status ${response.status}`
    );
  }

  const orderData = await response.json();
  return {
    id: orderData.id,
    status: orderData.status,
    links: orderData.links,
    isMock: false,
  };
}

/**
 * Capture a PayPal Order server-side
 */
export async function capturePayPalOrder(orderId: string) {
  const { clientId, clientSecret, apiBase } = getPayPalConfig();

  if (!clientId || !clientSecret || orderId.startsWith('MOCK-ORDER-')) {
    // Development fallback capture response
    return {
      id: orderId,
      status: 'COMPLETED',
      captureId: `MOCK-CAPTURE-${Date.now()}`,
      amount: '9.99',
      currency: 'USD',
      payer: { email_address: 'studio.user@trelvixai.com' },
      isMock: true,
    };
  }

  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${apiBase}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'PayPal-Request-Id': `capture-${orderId}-${Date.now()}`,
    },
  });

  if (!response.ok) {
    const errorDetails = await response.json();
    console.error('PayPal Order Capture Error:', JSON.stringify(errorDetails));
    throw new Error(
      errorDetails.message || `PayPal Order Capture failed with status ${response.status}`
    );
  }

  const captureData = await response.json();
  const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    id: captureData.id,
    status: captureData.status, // Should be 'COMPLETED'
    captureId: captureUnit?.id || captureData.id,
    amount: captureUnit?.amount?.value || '0.00',
    currency: captureUnit?.amount?.currency_code || 'USD',
    payer: captureData.payer,
    isMock: false,
  };
}

/**
 * Verify PayPal Webhook Event Signature
 */
export async function verifyPayPalWebhookSignature(headers: Record<string, string>, body: any) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
  const { clientId, clientSecret, apiBase } = getPayPalConfig();

  if (!clientId || !clientSecret || !webhookId) {
    // If webhook ID is not configured, fallback to basic event type inspection
    return true;
  }

  try {
    const accessToken = await getPayPalAccessToken();

    const verificationPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      client_id: clientId,
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: body,
    };

    const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verificationPayload),
    });

    if (response.ok) {
      const data = await response.json();
      return data.verification_status === 'SUCCESS';
    }
  } catch (err) {
    console.error('Error verifying PayPal webhook signature:', err);
  }

  return false;
}

// netlify/functions/yoco-charge.js
exports.handler = async (event) => {
  try {
    // Allow only POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse input from your frontend
    const { token, amountInCents, currency, description, customer, shippingAddress, cart } =
      JSON.parse(event.body || '{}');

    if (!token || !amountInCents) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing token or amount' })
      };
    }

    // Get your secret from Netlify env vars (do NOT hardcode!)
    const secretKey = process.env.YOCO_SECRET_KEY;
    if (!secretKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'YOCO_SECRET_KEY not configured' })
      };
    }

    // Charge via Yoco
    const resp = await fetch('https://online.yoco.com/v1/charges/', {
      method: 'POST',
      headers: {
        'X-Auth-Secret-Key': secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: currency || 'ZAR',
        description: description || 'Formetry order',
        // Extra info you’ll see in Yoco dashboard
        metadata: {
          customer_name:  customer?.name  || '',
          customer_email: customer?.email || '',
          customer_phone: customer?.phone || '',
          shipping_address: shippingAddress || '',
          cart_json: JSON.stringify(cart || {})
        }
      })
    });

    const data = await resp.json();

    // Handle Yoco errors
    if (!resp.ok || data.errorCode) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: true,
          message: data.displayMessage || 'Charge failed',
          raw: data
        })
      };
    }

    // Success: return charge ID to the browser
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, chargeId: data.id })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: true, message: 'Server error' })
    };
  }
};

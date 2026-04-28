// ToyyibPay - Create Bill API
// Cloudflare Pages Function
//
// Environment variables required (set in Cloudflare Dashboard > Pages > Settings > Environment Variables):
//   TOYYIBPAY_SECRET_KEY    - Your ToyyibPay secret key
//   TOYYIBPAY_CATEGORY_CODE - Your ToyyibPay category code
//   TOYYIBPAY_SANDBOX       - Set "true" untuk sandbox testing, kosong/false untuk production
//   SITE_URL                - Your site URL (e.g. https://teratakniaga.com)
//   GOOGLE_SHEET_WEBHOOK    - Google Apps Script web app URL

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { name, email, phone, package: pkg, price } = body;

    if (!name || !email || !phone || !pkg || !price) {
      return new Response(
        JSON.stringify({ error: 'Sila isi semua maklumat yang diperlukan.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const packageNames = {
      single: "YoungTiger Jersi Sehelai",
      combo2: "YoungTiger Kombo Home + Away",
      combo4: "YoungTiger Kombo Lengkap (4 Helai)",
    };

    const billName = packageNames[pkg] || "YoungTiger Jersey";
    const billAmount = price * 100;
    const siteUrl = env.SITE_URL || 'https://youngtiger.pages.dev';

    // Toggle sandbox/production
    const isSandbox = env.TOYYIBPAY_SANDBOX === 'true';
    const toyyibBaseUrl = isSandbox
      ? 'https://dev.toyyibpay.com'
      : 'https://toyyibpay.com';

    const formData = new URLSearchParams();
    formData.append('userSecretKey', env.TOYYIBPAY_SECRET_KEY);
    formData.append('categoryCode', env.TOYYIBPAY_CATEGORY_CODE);
    formData.append('billName', billName);
    formData.append('billDescription', `Pembelian ${billName}`);
    formData.append('billPriceSetting', 1);
    formData.append('billPayorInfo', 1);
    formData.append('billAmount', billAmount.toString());
    formData.append('billReturnUrl', `${siteUrl}/success.html`);
    formData.append('billCallbackUrl', `${siteUrl}/api/callback`);
    formData.append('billExternalReferenceNo', `YT-${Date.now()}`);
    formData.append('billTo', name);
    formData.append('billEmail', email);
    formData.append('billPhone', phone);
    formData.append('billPaymentChannel', 2);

    const response = await fetch(`${toyyibBaseUrl}/index.php/api/createBill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      // ToyyibPay returned plain text error like "[KEY-DID-NOT-MATCH]"
      let userMsg = 'Konfigurasi pembayaran tidak betul. Sila hubungi pihak kami.';
      if (rawText.includes('KEY-DID-NOT-MATCH')) {
        userMsg = 'TOYYIBPAY_SECRET_KEY tidak sah. Admin: Sila kemaskini environment variable.';
      } else if (rawText.includes('CATEGORY')) {
        userMsg = 'TOYYIBPAY_CATEGORY_CODE tidak sah. Admin: Sila kemaskini environment variable.';
      }
      return new Response(
        JSON.stringify({ error: userMsg, details: rawText.substring(0, 200) }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (result && result[0] && result[0].BillCode) {
      if (env.GOOGLE_SHEET_WEBHOOK) {
        const webhookFetch = fetch(env.GOOGLE_SHEET_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone,
            address: body.address,
            city: body.city,
            state: body.state,
            postcode: body.postcode,
            package: billName,
            price,
            originalPrice: body.originalPrice || price,
            customCount: body.customCount || 0,
            customAmount: body.customAmount || 0,
            jerseyDetails: body.jerseyDetails || '',
            shipping: body.shipping || 0,
            billCode: result[0].BillCode,
            paymentMethod: 'FPX',
            status: 'Pending',
          }),
          redirect: 'follow',
        }).catch(err => console.error('Webhook error:', err.message));

        // Cloudflare Workers terminate quickly — waitUntil keeps fetch alive
        if (waitUntil) waitUntil(webhookFetch);
      }

      return new Response(
        JSON.stringify({
          billCode: result[0].BillCode,
          paymentUrl: `${toyyibBaseUrl}/${result[0].BillCode}`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Gagal mencipta bil. Sila cuba lagi.', details: result }),
      { status: 500, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Server error. Sila cuba lagi.', message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
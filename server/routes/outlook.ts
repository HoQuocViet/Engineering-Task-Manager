import { Router } from 'express';
import { queryOne, queryAll, run } from '../db.js';

const router = Router();

function getRedirectUri(req: any): string {
  // 1. If explicit redirect_uri query or body parameter passed
  if (req.query?.redirect_uri && typeof req.query.redirect_uri === 'string') {
    return req.query.redirect_uri;
  }

  // 2. If client passed origin (e.g. from window.location.origin)
  if (req.query?.origin && typeof req.query.origin === 'string') {
    const cleanOrigin = req.query.origin.replace(/\/+$/, '');
    return `${cleanOrigin}/api/auth/outlook/callback`;
  }

  // 3. If APP_URL environment variable is present (Cloud Run public URL)
  if (process.env.APP_URL) {
    const cleanUrl = process.env.APP_URL.replace(/\/+$/, '');
    return `${cleanUrl}/api/auth/outlook/callback`;
  }

  // 4. Check x-forwarded-host header
  const forwardedHost = req.get('x-forwarded-host');
  if (forwardedHost) {
    const forwardedProto = req.get('x-forwarded-proto') || 'https';
    return `${forwardedProto}://${forwardedHost}/api/auth/outlook/callback`;
  }

  // 5. Fallback to host header
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/api/auth/outlook/callback`;
}

// Helper: refresh token if expired
async function getValidAccessToken(config: any): Promise<string | null> {
  if (!config || !config.refresh_token) return null;

  const now = Date.now();
  // If token is still valid for at least 3 minutes, reuse it
  if (config.access_token && config.token_expires_at && config.token_expires_at > now + 3 * 60 * 1000) {
    return config.access_token;
  }

  // Refresh token
  try {
    const tenantId = config.tenant_id || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      scope: 'openid profile email offline_access Calendars.Read',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Failed to refresh Microsoft token:', errData);
      return null;
    }

    const data: any = await res.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || config.refresh_token;
    const newExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

    run(`
      UPDATE outlook_config
      SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = ?
      WHERE id = 'default'
    `, [newAccessToken, newRefreshToken, newExpiresAt, new Date().toISOString()]);

    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

// Sync events from Microsoft Graph
async function fetchAndStoreGraphEvents(accessToken: string): Promise<number> {
  // Sync window: from 30 days ago to 90 days in future
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const end = new Date();
  end.setDate(end.getDate() + 90);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&$top=250&$select=id,subject,bodyPreview,start,end,location,isAllDay,isCancelled,organizer,attendees,webLink,onlineMeeting,onlineMeetingProvider`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API returned ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  const events = data.value || [];

  // Clear older synced events and insert fresh batch
  run('DELETE FROM outlook_events');

  for (const evt of events) {
    if (evt.isCancelled) continue;

    const startDateTime = evt.start?.dateTime || '';
    const endDateTime = evt.end?.dateTime || '';
    const startDate = startDateTime.slice(0, 10);
    const endDate = endDateTime.slice(0, 10);

    // Extract meeting link (Teams / Zoom / Webex)
    let meetingLink = evt.onlineMeeting?.joinUrl || '';
    if (!meetingLink && evt.bodyPreview) {
      const match = evt.bodyPreview.match(/https:\/\/(teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"]+|[a-zA-Z0-9-]+\.zoom\.us\/j\/[^\s<>"]+|[a-zA-Z0-9-]+\.webex\.com\/[^\s<>"]+)/i);
      if (match) meetingLink = match[0];
    }
    if (!meetingLink && evt.location?.displayName && evt.location.displayName.startsWith('http')) {
      meetingLink = evt.location.displayName;
    }

    const organizerName = evt.organizer?.emailAddress?.name || '';
    const organizerEmail = evt.organizer?.emailAddress?.address || '';
    const attendeesJson = JSON.stringify(
      (evt.attendees || []).map((a: any) => ({
        name: a.emailAddress?.name || '',
        email: a.emailAddress?.address || '',
        type: a.type || 'required',
      }))
    );

    run(`
      INSERT OR REPLACE INTO outlook_events (
        id, subject, body_preview, start_time, end_time, start_date, end_date,
        is_all_day, is_cancelled, location, meeting_link, organizer_name,
        organizer_email, attendees_json, web_link, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      evt.id,
      evt.subject || '(No Title)',
      evt.bodyPreview || '',
      startDateTime,
      endDateTime,
      startDate,
      endDate,
      evt.isAllDay ? 1 : 0,
      evt.isCancelled ? 1 : 0,
      evt.location?.displayName || '',
      meetingLink,
      organizerName,
      organizerEmail,
      attendeesJson,
      evt.webLink || '',
      new Date().toISOString(),
    ]);
  }

  // Update last synced at
  run(`
    UPDATE outlook_config
    SET last_synced_at = ?, updated_at = ?
    WHERE id = 'default'
  `, [new Date().toISOString(), new Date().toISOString()]);

  return events.length;
}

// 1. Get Outlook status & public config
router.get('/config', (req, res) => {
  try {
    const config = queryOne('SELECT * FROM outlook_config WHERE id = ?', ['default']);
    const eventCountRow = queryOne('SELECT COUNT(*) as count FROM outlook_events');
    const redirectUri = getRedirectUri(req);
    const hasToken = Boolean(config?.refresh_token || config?.access_token);
    const isConnected = Boolean(config?.is_connected && hasToken);

    res.json({
      is_connected: isConnected,
      client_id: config?.client_id || '',
      tenant_id: config?.tenant_id || '',
      has_secret: Boolean(config?.client_secret),
      user_email: config?.user_email || '',
      user_display_name: config?.user_display_name || '',
      last_synced_at: config?.last_synced_at || '',
      redirect_uri: redirectUri,
      event_count: eventCountRow?.count || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Save / update config
router.post('/config', (req, res) => {
  try {
    const { client_id, tenant_id, client_secret } = req.body;
    const existing = queryOne('SELECT * FROM outlook_config WHERE id = ?', ['default']);

    const secretToSave = client_secret !== undefined && client_secret !== '' 
      ? client_secret 
      : (existing?.client_secret || '');

    if (existing) {
      run(`
        UPDATE outlook_config
        SET client_id = ?, tenant_id = ?, client_secret = ?, updated_at = ?
        WHERE id = 'default'
      `, [client_id?.trim(), tenant_id?.trim(), secretToSave?.trim(), new Date().toISOString()]);
    } else {
      run(`
        INSERT INTO outlook_config (id, client_id, tenant_id, client_secret, is_connected, updated_at)
        VALUES ('default', ?, ?, ?, 0, ?)
      `, [client_id?.trim(), tenant_id?.trim(), secretToSave?.trim(), new Date().toISOString()]);
    }

    res.json({ success: true, message: 'Configuration saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Initiate OAuth Login
router.get('/login', (req, res) => {
  try {
    const config = queryOne('SELECT * FROM outlook_config WHERE id = ?', ['default']);
    if (!config?.client_id) {
      return res.status(400).json({ error: 'Azure Client ID is not configured.' });
    }

    // Default to 'common' for multi-tenant and consumer app registrations to avoid AADSTS9002346
    let tenantId = config.tenant_id?.trim() || 'common';
    if (tenantId === 'c5f8b837-074d-4184-92dc-984a1f2d33a8') {
      tenantId = 'common';
    }

    const redirectUri = getRedirectUri(req);
    const scope = 'openid profile email offline_access Calendars.Read';
    const statePayload = {
      nonce: Math.random().toString(36).substring(2, 15),
      redirectUri,
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const authUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(config.client_id)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=select_account`;

    // Return JSON if requested by API call, or redirect if directly accessed
    if (req.query.json === 'true') {
      return res.json({ authUrl, redirectUri });
    }

    res.redirect(authUrl);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. OAuth Callback
router.get('/callback', async (req, res) => {
  const { code, error, error_description, state } = req.query;

  // Extract redirectUri from state if present to guarantee 100% exact match with /authorize
  let redirectUri = getRedirectUri(req);
  if (state && typeof state === 'string') {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decoded?.redirectUri) {
        redirectUri = decoded.redirectUri;
      }
    } catch (e) {
      console.warn('Could not decode state payload:', e);
    }
  }

  if (error) {
    const errHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outlook Connection Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; text-align: center; background: #f8fafc; color: #1e293b; }
          .card { max-width: 540px; margin: auto; background: white; padding: 32px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
          h2 { color: #ef4444; font-size: 20px; margin-bottom: 12px; }
          p { font-size: 13px; line-height: 1.6; color: #475569; text-align: left; }
          .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 16px 0; text-align: left; }
          button { background: #0284c7; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Microsoft Sign-in Error</h2>
          <p>Microsoft Entra ID returned the following error:</p>
          <div class="error-box">${String(error_description || error)}</div>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OUTLOOK_AUTH_ERROR', error: "${String(error_description || error).replace(/"/g, '')}" }, '*');
          }
        </script>
      </body>
      </html>
    `;
    return res.status(400).send(errHtml);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const config = queryOne('SELECT * FROM outlook_config WHERE id = ?', ['default']);
    if (!config?.client_id || !config?.client_secret) {
      throw new Error('Azure Client ID or Client Secret is missing in application settings.');
    }

    const tenantId = config.tenant_id || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access Calendars.Read',
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      const rawError = errData.error_description || errData.error || 'Failed to exchange token with Microsoft';
      let hint = '';

      if (rawError.includes('AADSTS7000215') || rawError.toLowerCase().includes('invalid client secret')) {
        hint = 'In Azure Portal under "Certificates & secrets", ensure you copied the "Value" column, NOT the "Secret ID" (GUID). The Secret ID cannot be used as client credentials.';
      } else if (rawError.includes('AADSTS50011')) {
        hint = `The redirect URI in Azure App Registration > Authentication > Web must exactly match: ${redirectUri}`;
      } else if (rawError.includes('AADSTS700016')) {
        hint = 'Application with identifier not found. Please verify Application (client) ID and Tenant ID.';
      }

      throw new Error(hint ? `${rawError}\n\n[Action Required]: ${hint}` : rawError);
    }

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

    // Fetch user profile from Microsoft Graph
    let userEmail = '';
    let userDisplayName = '';
    try {
      const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const meData: any = await meRes.json();
        userEmail = meData.mail || meData.userPrincipalName || '';
        userDisplayName = meData.displayName || '';
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }

    // Save tokens and account details
    run(`
      UPDATE outlook_config
      SET access_token = ?, refresh_token = ?, token_expires_at = ?, user_email = ?, user_display_name = ?, is_connected = 1, updated_at = ?
      WHERE id = 'default'
    `, [accessToken, refreshToken, expiresAt, userEmail, userDisplayName, new Date().toISOString()]);

    // Initial calendar sync
    let syncedCount = 0;
    try {
      syncedCount = await fetchAndStoreGraphEvents(accessToken);
    } catch (syncErr) {
      console.error('Initial calendar sync error:', syncErr);
    }

    // Return friendly success page with postMessage to notify the parent window
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outlook Connected Successfully</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; text-align: center; background: #f8fafc; color: #1e293b; }
          .card { max-width: 480px; margin: auto; background: white; padding: 36px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .icon { width: 56px; height: 56px; line-height: 56px; background: #ecfdf5; color: #059669; border-radius: 50%; font-size: 28px; margin: 0 auto 16px; }
          h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
          p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
          .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>Outlook Calendar Connected</h2>
          <div class="badge">${userEmail || userDisplayName || 'Microsoft 365 Account'}</div>
          <p>Successfully synced ${syncedCount} calendar events. This window will close automatically.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OUTLOOK_AUTH_SUCCESS', email: "${userEmail}" }, '*');
            setTimeout(() => window.close(), 1200);
          } else {
            setTimeout(() => { window.location.href = '/'; }, 1500);
          }
        </script>
      </body>
      </html>
    `;

    res.send(successHtml);
  } catch (err: any) {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outlook Connection Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; text-align: center; background: #f8fafc; color: #1e293b; }
          .card { max-width: 540px; margin: auto; background: white; padding: 32px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
          h2 { color: #ef4444; font-size: 20px; margin-bottom: 12px; }
          p { font-size: 13px; line-height: 1.6; color: #475569; text-align: left; }
          .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-word; white-space: pre-wrap; margin: 16px 0; text-align: left; }
          button { background: #0284c7; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Connection Failed</h2>
          <p>Could not complete connection with Microsoft Outlook:</p>
          <div class="error-box">${String(err.message || err)}</div>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OUTLOOK_AUTH_ERROR', error: "${String(err.message || err).replace(/"/g, '').replace(/\n/g, ' ')}" }, '*');
          }
        </script>
      </body>
      </html>
    `;
    res.status(500).send(errorHtml);
  }
});

// 4.5. Exchange code manually or extracted from redirect/error URL
router.post('/exchange-code', async (req, res) => {
  try {
    const { codeOrUrl } = req.body;
    if (!codeOrUrl || typeof codeOrUrl !== 'string') {
      return res.status(400).json({ error: 'Please provide the authorization code or redirected URL.' });
    }

    let raw = codeOrUrl.trim();
    let extractedCode = '';

    // Handle full redirect URL or error bridge URL containing code=
    if (raw.includes('code=')) {
      try {
        // Decode nested url encodings if present
        let decoded = raw;
        for (let i = 0; i < 3; i++) {
          if (decoded.includes('%3D') || decoded.includes('%26') || decoded.includes('%3F')) {
            decoded = decodeURIComponent(decoded);
          }
        }
        const match = decoded.match(/[?&]code=([^&#\s]+)/);
        if (match && match[1]) {
          extractedCode = match[1];
        }
      } catch (e) {
        console.warn('Regex extraction fallback:', e);
      }
    }

    if (!extractedCode) {
      // User may have pasted the code directly
      extractedCode = raw;
    }

    // Clean up any remaining URL query artifacts
    extractedCode = extractedCode.split('&')[0].split('#')[0].trim();

    const config = queryOne('SELECT * FROM outlook_config WHERE id = ?', ['default']);
    if (!config?.client_id || !config?.client_secret) {
      return res.status(400).json({ 
        error: 'Azure Client ID or Client Secret is missing. Please enter and save them in the credentials section first.' 
      });
    }

    const redirectUri = getRedirectUri(req);
    let tenantId = config.tenant_id?.trim() || 'common';
    if (tenantId === 'c5f8b837-074d-4184-92dc-984a1f2d33a8') {
      tenantId = 'common';
    }

    let tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const requestToken = async (targetUrl: string) => {
      const params = new URLSearchParams({
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'authorization_code',
        code: extractedCode,
        redirect_uri: redirectUri,
        scope: 'openid profile email offline_access Calendars.Read',
      });

      return fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
    };

    let tokenRes = await requestToken(tokenUrl);
    let tokenData: any = await tokenRes.json().catch(() => ({}));

    // If tenant gave AADSTS9002346, fallback to /common or /consumers
    if (!tokenRes.ok && String(tokenData.error_description || '').includes('AADSTS9002346')) {
      tokenUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;
      tokenRes = await requestToken(tokenUrl);
      tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok && String(tokenData.error_description || '').includes('AADSTS9002346')) {
        tokenUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/token`;
        tokenRes = await requestToken(tokenUrl);
        tokenData = await tokenRes.json().catch(() => ({}));
      }
    }

    if (!tokenRes.ok) {
      const rawError = tokenData.error_description || tokenData.error || 'Failed to exchange token with Microsoft';
      let hint = '';

      if (rawError.includes('AADSTS7000215') || rawError.toLowerCase().includes('invalid client secret')) {
        hint = 'In Azure Portal under "Certificates & secrets", copy the "Value" column, NOT the "Secret ID" (GUID).';
      } else if (rawError.includes('AADSTS50011')) {
        hint = `Redirect URI mismatch. In Azure App Registration, ensure the Redirect URI is set to: ${redirectUri}`;
      } else if (rawError.includes('AADSTS70000') || rawError.includes('AADSTS70008')) {
        hint = 'This authorization code has expired or was already used. Please click "Sign in with Microsoft 365" again to generate a new code.';
      }

      return res.status(400).json({ 
        error: hint ? `${rawError}\n\n👉 Recommendation: ${hint}` : rawError 
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

    // Fetch user profile from Microsoft Graph
    let userEmail = '';
    let userDisplayName = '';
    try {
      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        userEmail = userData.mail || userData.userPrincipalName || '';
        userDisplayName = userData.displayName || '';
      }
    } catch (e) {
      console.warn('Could not fetch user profile from Microsoft Graph:', e);
    }

    // Persist tokens
    run(`
      UPDATE outlook_config
      SET access_token = ?, refresh_token = ?, token_expires_at = ?, is_connected = 1,
          user_email = COALESCE(?, user_email), user_display_name = COALESCE(?, user_display_name), updated_at = ?
      WHERE id = 'default'
    `, [accessToken, refreshToken, expiresAt, userEmail || null, userDisplayName || null, new Date().toISOString()]);

    // Perform initial calendar events synchronization
    let eventCount = 0;
    try {
      eventCount = await fetchAndStoreGraphEvents(accessToken);
    } catch (e: any) {
      console.error('Initial sync after manual exchange error:', e);
    }

    return res.json({
      success: true,
      count: eventCount,
      user_email: userEmail,
      user_display_name: userDisplayName,
      message: `Connected to Microsoft Outlook successfully! Synchronized ${eventCount} meetings.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Manual / Automatic Sync trigger
router.post('/sync', async (req, res) => {
  try {
    const config = queryOne('SELECT * FROM outlook_config WHERE id = ?', ['default']);
    const hasToken = Boolean(config?.refresh_token || config?.access_token);
    if (!config || !config.is_connected || !hasToken) {
      return res.status(400).json({ 
        error: 'Microsoft Outlook is not connected yet. Please click "Sign in with Microsoft 365" in the Sync modal to authenticate your account.' 
      });
    }

    const accessToken = await getValidAccessToken(config);
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token expired or revoked. Please reconnect Microsoft Outlook.' });
    }

    const count = await fetchAndStoreGraphEvents(accessToken);
    const updated = queryOne('SELECT last_synced_at FROM outlook_config WHERE id = ?', ['default']);

    res.json({
      success: true,
      count,
      last_synced_at: updated?.last_synced_at || new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get cached calendar events / meetings
router.get('/events', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = 'SELECT * FROM outlook_events';
    const params: any[] = [];

    if (startDate && endDate) {
      sql += ' WHERE (start_date >= ? AND start_date <= ?) OR (end_date >= ? AND end_date <= ?)';
      params.push(startDate, endDate, startDate, endDate);
    }
    sql += ' ORDER BY start_time ASC';

    const rows = queryAll(sql, params);
    res.json({ events: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. Create meeting (MS Teams / Calendar Event)
router.post('/events', (req, res) => {
  try {
    const {
      subject,
      body_preview,
      start_date,
      end_date,
      start_time,
      end_time,
      is_all_day,
      location,
      meeting_link,
      organizer_name,
      organizer_email,
      attendees,
    } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Meeting subject is required.' });
    }

    const sDate = start_date || new Date().toISOString().slice(0, 10);
    const eDate = end_date || sDate;
    const sTime = start_time ? (start_time.includes('T') ? start_time : `${sDate}T${start_time}:00`) : `${sDate}T09:00:00`;
    const eTime = end_time ? (end_time.includes('T') ? end_time : `${eDate}T${end_time}:00`) : `${eDate}T10:00:00`;
    const newId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const attendeesJson = attendees ? JSON.stringify(attendees) : '[]';

    run(`
      INSERT INTO outlook_events (
        id, subject, body_preview, start_time, end_time, start_date, end_date,
        is_all_day, is_cancelled, location, meeting_link, organizer_name,
        organizer_email, attendees_json, web_link, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      subject.trim(),
      body_preview?.trim() || '',
      sTime,
      eTime,
      sDate,
      eDate,
      is_all_day ? 1 : 0,
      location?.trim() || 'Microsoft Teams',
      meeting_link?.trim() || '',
      organizer_name?.trim() || 'Engineering Team',
      organizer_email?.trim() || '',
      attendeesJson,
      meeting_link?.trim() || '',
      nowIso,
    ]);

    const created = queryOne('SELECT * FROM outlook_events WHERE id = ?', [newId]);
    res.json({ success: true, event: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6c. Update meeting (MS Teams / Calendar Event)
router.put('/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM outlook_events WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Meeting event not found.' });
    }

    const {
      subject,
      body_preview,
      start_date,
      end_date,
      start_time,
      end_time,
      is_all_day,
      location,
      meeting_link,
      organizer_name,
      organizer_email,
      attendees,
    } = req.body;

    const sDate = start_date || existing.start_date;
    const eDate = end_date || sDate;
    const sTime = start_time ? (start_time.includes('T') ? start_time : `${sDate}T${start_time}:00`) : existing.start_time;
    const eTime = end_time ? (end_time.includes('T') ? end_time : `${eDate}T${end_time}:00`) : existing.end_time;
    const attendeesJson = attendees !== undefined ? JSON.stringify(attendees) : existing.attendees_json;

    run(`
      UPDATE outlook_events
      SET subject = COALESCE(?, subject),
          body_preview = COALESCE(?, body_preview),
          start_date = ?,
          end_date = ?,
          start_time = ?,
          end_time = ?,
          is_all_day = ?,
          location = COALESCE(?, location),
          meeting_link = COALESCE(?, meeting_link),
          organizer_name = COALESCE(?, organizer_name),
          organizer_email = COALESCE(?, organizer_email),
          attendees_json = ?,
          web_link = COALESCE(?, web_link),
          synced_at = ?
      WHERE id = ?
    `, [
      subject?.trim() || existing.subject,
      body_preview !== undefined ? body_preview.trim() : existing.body_preview,
      sDate,
      eDate,
      sTime,
      eTime,
      is_all_day !== undefined ? (is_all_day ? 1 : 0) : existing.is_all_day,
      location !== undefined ? location.trim() : existing.location,
      meeting_link !== undefined ? meeting_link.trim() : existing.meeting_link,
      organizer_name !== undefined ? organizer_name.trim() : existing.organizer_name,
      organizer_email !== undefined ? organizer_email.trim() : existing.organizer_email,
      attendeesJson,
      meeting_link !== undefined ? meeting_link.trim() : existing.web_link,
      new Date().toISOString(),
      id,
    ]);

    const updated = queryOne('SELECT * FROM outlook_events WHERE id = ?', [id]);
    res.json({ success: true, event: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6d. Delete meeting (MS Teams / Calendar Event)
router.delete('/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    run('DELETE FROM outlook_events WHERE id = ?', [id]);
    res.json({ success: true, message: 'Meeting deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Disconnect Outlook
router.post('/disconnect', (req, res) => {
  try {
    run(`
      UPDATE outlook_config
      SET access_token = NULL, refresh_token = NULL, token_expires_at = 0, is_connected = 0, user_email = NULL, user_display_name = NULL, updated_at = ?
      WHERE id = 'default'
    `, [new Date().toISOString()]);

    run('DELETE FROM outlook_events');

    res.json({ success: true, message: 'Disconnected Outlook successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Sample Office 365 Sync (Instant preview / testing without Azure admin approval)
router.post('/sample-sync', (req, res) => {
  try {
    const today = new Date();
    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const addDays = (d: Date, days: number) => {
      const n = new Date(d);
      n.setDate(n.getDate() + days);
      return n;
    };

    const dToday = formatDate(today);
    const dTomorrow = formatDate(addDays(today, 1));
    const dPlus3 = formatDate(addDays(today, 3));
    const dPlus7 = formatDate(addDays(today, 7));
    const dPlus12 = formatDate(addDays(today, 12));

    const sampleEvents = [
      {
        id: 'sample-evt-1',
        subject: 'Weekly PTSC & Client Project Coordination Meeting',
        body_preview: 'Weekly review of EPC deliverables, equipment fabrication status, and key procurement package milestones.',
        start_time: `${dToday}T09:00:00`,
        end_time: `${dToday}T10:30:00`,
        start_date: dToday,
        end_date: dToday,
        location: 'Microsoft Teams Meeting',
        meeting_link: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ptsc_coordination%40thread.v2/0',
        organizer_name: 'Nguyen Van Hai',
        organizer_email: 'hai.nguyen@ptsc.com.vn',
        attendees: [{ name: 'Project Team', email: 'project-core@ptsc.com.vn' }],
      },
      {
        id: 'sample-evt-2',
        subject: 'Block B CPP - HAZOP Closeout Review Session',
        body_preview: 'Discuss outstanding HAZOP action items for high-pressure separation train and ESD logic with Murphy Oil & Wood Group.',
        start_time: `${dTomorrow}T14:00:00`,
        end_time: `${dTomorrow}T16:00:00`,
        start_date: dTomorrow,
        end_date: dTomorrow,
        location: 'Meeting Room 302 & MS Teams',
        meeting_link: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_hazop_closeout%40thread.v2/0',
        organizer_name: 'Tran Minh Tuan',
        organizer_email: 'tuan.tran@ptsc.com.vn',
        attendees: [{ name: 'Process Safety Lead', email: 'safety@ptsc.com.vn' }],
      },
      {
        id: 'sample-evt-3',
        subject: 'Vendor Technical Clarification: Valve Package (PRJ-B01)',
        body_preview: 'Technical alignment with Cameron / SLB on valve metallurgy, sour service compliance (NACE MR0175), and testing schedules.',
        start_time: `${dPlus3}T10:00:00`,
        end_time: `${dPlus3}T11:30:00`,
        start_date: dPlus3,
        end_date: dPlus3,
        location: 'Microsoft Teams Meeting',
        meeting_link: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_vendor_tbe_slb%40thread.v2/0',
        organizer_name: 'Ho Quoc Viet',
        organizer_email: 'viet.ho@ptsc.com.vn',
        attendees: [{ name: 'SLB Application Engineer', email: 'cameron.sales@slb.com' }],
      },
      {
        id: 'sample-evt-4',
        subject: 'FPSO Tie-back Piping Stress & Layout Alignment',
        body_preview: 'Review CAESAR II piping stress calculation outputs and nozzle load summaries for Lac Da Vang WHP-A.',
        start_time: `${dPlus7}T13:30:00`,
        end_time: `${dPlus7}T15:00:00`,
        start_date: dPlus7,
        end_date: dPlus7,
        location: 'Engineering Conf Room 4',
        meeting_link: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_piping_stress%40thread.v2/0',
        organizer_name: 'Piping Lead Engineer',
        organizer_email: 'piping.lead@ptsc.com.vn',
        attendees: [{ name: 'Stress Eng', email: 'stress.eng@ptsc.com.vn' }],
      },
      {
        id: 'sample-evt-5',
        subject: 'White Tiger Compressor Upgrade - Factory Acceptance Test (FAT) Prep',
        body_preview: 'Preparation session for 2x 25MW Gas Turbine Driven Centrifugal Compressors FAT documentation package.',
        start_time: `${dPlus12}T09:30:00`,
        end_time: `${dPlus12}T11:00:00`,
        start_date: dPlus12,
        end_date: dPlus12,
        location: 'Virtual Conference',
        meeting_link: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_fat_prep%40thread.v2/0',
        organizer_name: 'Machinery Lead',
        organizer_email: 'machinery@ptsc.com.vn',
        attendees: [{ name: 'VSP Rep', email: 'rep@vietsov.com.vn' }],
      },
    ];

    run('DELETE FROM outlook_events');

    for (const evt of sampleEvents) {
      run(`
        INSERT INTO outlook_events (
          id, subject, body_preview, start_time, end_time, start_date, end_date,
          is_all_day, is_cancelled, location, meeting_link, organizer_name,
          organizer_email, attendees_json, web_link, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, '', ?)
      `, [
        evt.id,
        evt.subject,
        evt.body_preview,
        evt.start_time,
        evt.end_time,
        evt.start_date,
        evt.end_date,
        evt.location,
        evt.meeting_link,
        evt.organizer_name,
        evt.organizer_email,
        JSON.stringify(evt.attendees),
        new Date().toISOString(),
      ]);
    }

    run(`
      UPDATE outlook_config
      SET is_connected = 0, user_email = 'ptscmc.ai11@gmail.com', user_display_name = 'Ho Quoc Viet (Sample Office 365)', last_synced_at = ?, updated_at = ?
      WHERE id = 'default'
    `, [new Date().toISOString(), new Date().toISOString()]);

    res.json({
      success: true,
      count: sampleEvents.length,
      last_synced_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

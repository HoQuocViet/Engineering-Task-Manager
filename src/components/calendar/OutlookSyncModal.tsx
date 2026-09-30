import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { OutlookConfigStatus } from '../../types';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  ShieldCheck,
  Calendar,
  LogOut,
  Copy,
  Check,
  Sparkles,
  Link2,
} from 'lucide-react';

interface OutlookSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  config: OutlookConfigStatus | null;
  refreshConfig: () => Promise<void>;
  showToast: (msg: string) => void;
}

export const OutlookSyncModal: React.FC<OutlookSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  config,
  refreshConfig,
  showToast,
}) => {
  const [clientId, setClientId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [showConfigFields, setShowConfigFields] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [authCodeInput, setAuthCodeInput] = useState('');
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  useEffect(() => {
    if (config) {
      setClientId(config.client_id || '');
      setTenantId(config.tenant_id || '');
    }
  }, [config]);

  if (!isOpen) return null;

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.saveOutlookConfig({
        client_id: clientId,
        tenant_id: tenantId,
        client_secret: clientSecret || undefined,
      });
      showToast('Azure credentials updated successfully.');
      await refreshConfig();
      setShowConfigFields(false);
    } catch (err: any) {
      showToast(`Error saving configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectOffice365 = async () => {
    try {
      setPopupBlocked(false);
      const loginData = await api.getOutlookLoginUrl(window.location.origin);
      setAuthUrl(loginData.authUrl);

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        loginData.authUrl,
        'Microsoft 365 Authentication',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      // Check if popup was blocked
      if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
        setPopupBlocked(true);
        showToast('Browser blocked popup window. Click "Open Microsoft Login in New Tab" below.');
      }

      // Listen for message from popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'OUTLOOK_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          showToast('Connected to Microsoft Outlook successfully!');
          setPopupBlocked(false);
          await refreshConfig();
          onSyncComplete();
        } else if (event.data?.type === 'OUTLOOK_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          showToast(`Microsoft connection error: ${event.data.error}`);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      showToast(`Could not start Microsoft login: ${err.message}`);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncOutlookCalendar();
      showToast(`Synced ${res.count} Outlook events successfully.`);
      await refreshConfig();
      onSyncComplete();
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSampleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.sampleSyncOutlook();
      showToast(`Loaded ${res.count} sample Office 365 engineering meetings!`);
      await refreshConfig();
      onSyncComplete();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Microsoft Outlook and remove synced events?')) return;
    try {
      await api.disconnectOutlook();
      showToast('Disconnected Microsoft Outlook.');
      await refreshConfig();
      onSyncComplete();
    } catch (err: any) {
      showToast(`Disconnect error: ${err.message}`);
    }
  };

  const handleExchangeManualCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCodeInput.trim()) return;
    setIsExchangingCode(true);
    try {
      const res = await api.exchangeOutlookCode(authCodeInput.trim());
      showToast(res.message || `Connected! Synced ${res.count} meetings.`);
      setAuthCodeInput('');
      await refreshConfig();
      onSyncComplete();
    } catch (err: any) {
      showToast(`Connection error: ${err.message}`);
    } finally {
      setIsExchangingCode(false);
    }
  };

  const copyRedirectUri = () => {
    if (config?.redirect_uri) {
      navigator.clipboard.writeText(config.redirect_uri);
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
      showToast('Redirect URI copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                MICROSOFT OUTLOOK CALENDAR SYNC
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Office 365 & Microsoft Graph API Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Connection Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Connection Status
              </span>
              {config?.is_connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Not Connected
                </span>
              )}
            </div>

            {config?.is_connected ? (
              <div className="space-y-1 text-xs">
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {config.user_display_name || config.user_email || 'Office 365 User'}
                </div>
                {config.user_email && (
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {config.user_email}
                  </div>
                )}
                <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 flex items-center justify-between">
                  <span>Last synced: {config.last_synced_at ? new Date(config.last_synced_at).toLocaleString() : 'Never'}</span>
                  <span>{config.event_count || 0} events in calendar</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect your Office 365 account to automatically sync your meetings, team discussions, and online meeting links directly into the Deadlines & Calendar view.
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {config?.is_connected ? (
                <>
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Calendar Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleConnectOffice365}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Sign in with Microsoft 365</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSampleSync}
                    disabled={isSyncing}
                    title="Populate realistic sample Office 365 meetings with Teams links right away"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Load Sample 365 Meetings</span>
                  </button>
                </>
              )}
            </div>

            {/* Popup Blocked Warning & Direct Link */}
            {popupBlocked && authUrl && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg text-xs space-y-2">
                <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Popup was blocked by your browser</span>
                </div>
                <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
                  Your browser prevented the authentication popup from opening automatically. Click the link below to open Microsoft sign-in directly in a new tab:
                </p>
                <a
                  href={authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Microsoft 365 Login in New Tab</span>
                </a>
              </div>
            )}

            {/* Manual Code / 403 Bypass Input */}
            {!config?.is_connected && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>If Google shows "Error 403 Forbidden", complete connection here:</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  After signing in with Microsoft, if the popup opens to Google's <em>403 Forbidden (applet-auth-bridge)</em>, copy the full URL from that browser address bar and paste it below:
                </p>
                <form onSubmit={handleExchangeManualCode} className="flex gap-2">
                  <input
                    type="text"
                    value={authCodeInput}
                    onChange={(e) => setAuthCodeInput(e.target.value)}
                    placeholder="Paste the URL from the 403 page or code here..."
                    className="flex-1 text-xs font-mono px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isExchangingCode || !authCodeInput.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors shrink-0"
                  >
                    {isExchangingCode ? 'Connecting...' : 'Connect'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Azure Entra Registration Info & Toggle */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Azure App Registration Credentials
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigFields(!showConfigFields)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                {showConfigFields ? 'Hide Details' : 'View / Edit Credentials'}
              </button>
            </div>

            {/* Redirect URI Info for Microsoft Entra */}
            {config?.redirect_uri && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                  <span>Redirect URI (Web) for Azure App Registration:</span>
                  <button
                    type="button"
                    onClick={copyRedirectUri}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRedirect ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all select-all">
                  {config.redirect_uri}
                </div>
              </div>
            )}

            {showConfigFields && (
              <form onSubmit={handleSaveConfig} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Application (Client) ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="c35e8947-da5e-4ee0-9438-b144bc773f20"
                    className="w-full text-xs font-mono px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Directory (Tenant) ID
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="c5f8b837-074d-4184-92dc-984a1f2d33a8 (or 'common')"
                    className="w-full text-xs font-mono px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Use your Directory ID or "common" for any Microsoft 365 or personal accounts.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Client Secret {config?.has_secret && <span className="text-emerald-600 font-normal">(Configured ✓)</span>}
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={config?.has_secret ? '••••••••••••••••' : 'Enter client secret value'}
                    className="w-full text-xs font-mono px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <div className="mt-1.5 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[10.5px] text-amber-800 dark:text-amber-300 leading-normal">
                    <strong>Notice:</strong> In Azure Portal under <em>Certificates & secrets</em>, copy the <strong>Value</strong> column, not the <strong>Secret ID</strong> (which is a GUID). The Secret ID is rejected by Microsoft with error <code>AADSTS7000215</code>.
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    {isSaving ? 'Saving...' : 'Save Azure Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

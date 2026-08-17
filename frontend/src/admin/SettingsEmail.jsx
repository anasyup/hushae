import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, AlertTriangle, Eye, EyeOff, FileText, Mail, Save, Send, ShieldCheck, Sparkles, Star, ToggleLeft, ToggleRight, Info, Plus
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

function BackToSettings() {
  return (
    <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
      <ArrowLeft size={13} /> Settings
    </Link>
  );
}

function PageIntro({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="font-sans text-2xl leading-tight text-neutral-900">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function Section({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-900">{title}</p>
          {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsEmail() {
  const { auth, toast } = useApp();
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testTemplateEmail, setTestTemplateEmail] = useState('');
  
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [templateTestBusy, setTemplateTestBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPreview, setShowShowPreview] = useState(false);

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Load everything
  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  const loadSettings = () => {
    api('/settings/admin', { token: auth.token })
      .then((d) => {
        setSettings(d.settings);
        setOriginalSettings(JSON.stringify(d.settings));
      })
      .catch(() => toast('Could not load settings'));
  };

  const loadTemplates = () => {
    api('/email-templates', { token: auth.token })
      .then((d) => {
        setTemplates(d.templates || []);
      })
      .catch(() => toast('Could not load email templates'));
  };

  const isSettingsDirty = settings && originalSettings && JSON.stringify(settings) !== originalSettings;

  const handleSettingsSave = async () => {
    setBusy(true);
    try {
      await api('/settings', {
        method: 'PUT',
        token: auth.token,
        body: { integrations: settings.integrations },
      });
      setOriginalSettings(JSON.stringify(settings));
      toast('SMTP configurations saved successfully.');
    } catch (e) {
      toast(e.message || 'Failed to save SMTP configurations');
    } finally {
      setBusy(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) return toast('Please enter a test email address.');
    setTestBusy(true);
    try {
      const res = await api('/settings/test-email', {
        method: 'POST',
        token: auth.token,
        body: { to: testEmail.trim() },
      });
      if (res.ok) {
        toast('Test email sent successfully! Please check your inbox.');
      } else {
        toast(res.error || 'Failed to send test email.');
      }
    } catch (e) {
      toast(e.message || 'Error sending test email.');
    } finally {
      setTestBusy(false);
    }
  };

  const handleTemplateClick = (t) => {
    setSelectedTemplate(t);
    setEditSubject(t.subject);
    setEditBody(t.bodyHTML);
    setEditActive(t.active !== false);
    setShowShowPreview(false);
  };

  const handleTemplateSave = async () => {
    if (!selectedTemplate) return;
    setBusy(true);
    try {
      const res = await api(`/email-templates/${selectedTemplate.templateKey}`, {
        method: 'PUT',
        token: auth.token,
        body: {
          subject: editSubject,
          bodyHTML: editBody,
          active: editActive,
        },
      });
      toast('Template saved successfully.');
      // Refresh templates
      setTemplates((prev) =>
        prev.map((item) =>
          item.templateKey === selectedTemplate.templateKey ? res.template : item
        )
      );
      setSelectedTemplate(res.template);
    } catch (e) {
      toast(e.message || 'Failed to save template');
    } finally {
      setBusy(false);
    }
  };

  const handleSendTemplateTest = async () => {
    if (!selectedTemplate) return;
    if (!testTemplateEmail.trim()) return toast('Please enter a recipient email.');
    setTemplateTestBusy(true);
    try {
      const res = await api(`/email-templates/${selectedTemplate.templateKey}/test`, {
        method: 'POST',
        token: auth.token,
        body: { to: testTemplateEmail.trim() },
      });
      if (res.ok) {
        toast('Real template test email sent successfully! Please check your inbox.');
      } else {
        toast(res.error || 'Failed to send template test email.');
      }
    } catch (e) {
      toast(e.message || 'Error sending test email.');
    } finally {
      setTemplateTestBusy(false);
    }
  };

  const insertVariable = (varName, targetField) => {
    const textToInsert = `{${varName}}`;
    if (targetField === 'subject') {
      const input = subjectRef.current;
      if (!input) return;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const nextText = editSubject.substring(0, start) + textToInsert + editSubject.substring(end);
      setEditSubject(nextText);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
    } else {
      const textarea = bodyRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const nextText = editBody.substring(0, start) + textToInsert + editBody.substring(end);
      setEditBody(nextText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
    }
  };

  // Mock template render for instant preview
  const renderPreview = (subj, body) => {
    const mockVars = {
      customerName: 'Muhammad Anas',
      orderNumber: 'HS-1042',
      total: 'PKR 6,450',
      deliveryAddress: 'House 42, Block C, Gulberg III, Lahore, Punjab — 54000 (+92 300 1234567)',
      productsList: `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
            <div style="font-weight:600;font-size:13px;">HUSHAE Winter Thermal Vest</div>
            <div style="font-size:11px;color:#7a736d;margin-top:2px;">White · Medium · Qty 2</div>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">PKR 4,950</td>
        </tr>
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;">
            <div style="font-weight:600;font-size:13px;">Premium Cotton Boxer Brief</div>
            <div style="font-size:11px;color:#7a736d;margin-top:2px;">Black · Medium · Qty 1</div>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f1eee8;text-align:right;font-weight:600;font-size:13px;">PKR 1,500</td>
        </tr>
      `,
      storeName: 'HUSHAE',
      customerPhone: '+92 300 1234567',
      customerEmail: 'customer@hushae.pk',
      city: 'Lahore',
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      statusTitle: 'Your order has shipped',
      statusText: 'Your parcel is now on its way. It usually reaches within 2–5 working days.',
      trackingNumber: 'LEO-12345678',
      courierName: 'Leopards Courier',
      discountCode: 'WELCOME10',
      discountPercent: '10',
      expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-PK')
    };

    let sResult = subj;
    let bResult = body;

    for (const [k, v] of Object.entries(mockVars)) {
      sResult = sResult.replace(new RegExp(`{${k}}`, 'g'), v);
      bResult = bResult.replace(new RegExp(`{${k}}`, 'g'), v);
    }

    return { subject: sResult, body: bResult };
  };

  if (!settings) {
    return (
      <AdminLayout title="Email & SMTP">
        <div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" />
      </AdminLayout>
    );
  }

  const emailCfg = settings?.integrations?.email || { host: '', port: 587, secure: false, user: '', pass: '', from: '', adminAlert: '' };
  const setEmailValue = (k, v) => {
    setSettings((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        email: {
          ...emailCfg,
          [k]: v,
        },
      },
    }));
  };

  const isSmtpConfigured = !!(emailCfg.host && emailCfg.user && emailCfg.pass);
  const previewData = selectedTemplate ? renderPreview(editSubject, editBody) : { subject: '', body: '' };

  return (
    <AdminLayout title="Email & SMTP Settings">
      <div className="mx-auto max-w-6xl">
        <BackToSettings />
        <PageIntro
          icon={Mail}
          title="Email & SMTP Settings"
          description="Manage transactional email templates, edit layouts and subjects, configure custom SMTP server credentials, and verify with mock/real test previews."
        />

        {!isSmtpConfigured && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900 shadow-sm">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
            <div>
              <p className="font-semibold">SMTP Credentials are not fully set up</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                Without SMTP configured, email templates can still be edited and previewed locally, but real transactional emails (like Order Confirmations, Shipping updates) will not reach your customers. They will only be logged in the developer console.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT: SMTP Configuration & Template Lists (7 columns) */}
          <div className="space-y-6 lg:col-span-7">
            {/* SMTP Config */}
            <Section
              title="SMTP Configuration"
              description="Configure secure connection parameters for automatic customer email delivery."
              action={
                <button
                  onClick={handleSettingsSave}
                  disabled={busy || !isSettingsDirty}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                >
                  <Save size={13} /> {busy ? 'Saving…' : 'Save SMTP'}
                </button>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">SMTP Host</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                    value={emailCfg.host || ''}
                    onChange={(e) => setEmailValue('host', e.target.value)}
                    placeholder="e.g. smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">SMTP Port</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                    value={emailCfg.port || 587}
                    onChange={(e) => setEmailValue('port', Number(e.target.value) || 587)}
                    placeholder="e.g. 587"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Username / User</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                    value={emailCfg.user || ''}
                    onChange={(e) => setEmailValue('user', e.target.value)}
                    placeholder="e.g. care@hushae.pk"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 pr-10"
                      value={emailCfg.pass || ''}
                      onChange={(e) => setEmailValue('pass', e.target.value)}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Sender Name / From Address</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                    value={emailCfg.from || ''}
                    onChange={(e) => setEmailValue('from', e.target.value)}
                    placeholder="e.g. HUSHAE <care@hushae.pk>"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Admin Alert Target Email</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                    value={emailCfg.adminAlert || ''}
                    onChange={(e) => setEmailValue('adminAlert', e.target.value)}
                    placeholder="e.g. alert@hushae.pk"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-neutral-900">Use Secure TLS Connection (SSL/TLS)</p>
                      <p className="text-[12px] text-neutral-500">Enable if your server requires direct SSL/TLS encryption (usually on port 465).</p>
                    </div>
                    <span
                      onClick={() => setEmailValue('secure', !emailCfg.secure)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${emailCfg.secure ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${emailCfg.secure ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Test Connection */}
            <Section
              title="Test Connection"
              description="Verify SMTP server credentials with a test email."
            >
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 flex-1"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g. mytest@gmail.com"
                  type="email"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testBusy || !isSmtpConfigured}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                >
                  <Send size={12} /> {testBusy ? 'Sending…' : 'Send Test'}
                </button>
              </div>
            </Section>

            {/* Transactional templates list */}
            <Section
              title="Transactional Email Templates"
              description="Six system email templates sent automatically based on order actions."
            >
              <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
                {templates.map((t) => (
                  <button
                    key={t.templateKey}
                    type="button"
                    onClick={() => handleTemplateClick(t)}
                    className={`flex w-full items-center justify-between p-4 text-left transition hover:bg-neutral-50 ${
                      selectedTemplate?.templateKey === t.templateKey ? 'bg-neutral-50 font-semibold border-l-4 border-neutral-900' : ''
                    }`}
                  >
                    <div>
                      <p className="text-[13px] font-medium text-neutral-900">{t.name}</p>
                      <p className="mt-0.5 text-[12px] text-neutral-500 font-normal">/{t.templateKey} · {t.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider ${
                        t.active !== false ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {t.active !== false ? 'Active' : 'Disabled'}
                      </span>
                      <ChevronRight size={13} className="text-neutral-400" />
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          </div>

          {/* RIGHT: Template Editing & Preview Panel (5 columns) */}
          <div className="lg:col-span-5">
            {selectedTemplate ? (
              <div className="space-y-6">
                <Section
                  title={`Edit: ${selectedTemplate.name}`}
                  description="Customize email layout, subject line, templates html, and variables."
                  action={
                    <button
                      onClick={handleTemplateSave}
                      disabled={busy}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1 text-[12px] font-semibold text-white transition hover:bg-neutral-800"
                    >
                      <Save size={13} /> {busy ? 'Saving…' : 'Save'}
                    </button>
                  }
                >
                  <div className="space-y-4">
                    {/* Active Toggle */}
                    <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
                      <span className="text-[13px] font-medium text-neutral-700">Enable this email notification</span>
                      <span
                        onClick={() => setEditActive(!editActive)}
                        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition ${editActive ? 'bg-neutral-900' : 'bg-neutral-300'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${editActive ? 'left-[18px]' : 'left-0.5'}`} />
                      </span>
                    </div>

                    {/* Subject Line */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Subject Line</label>
                        <span className="text-[12px] text-neutral-500 font-mono">{`{...} variables work`}</span>
                      </div>
                      <input
                        ref={subjectRef}
                        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 font-medium"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        placeholder="Subject Line"
                      />
                    </div>

                    {/* HTML Content Body */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Template Body (HTML)</label>
                        <span className="text-[12px] text-neutral-500 font-mono">Full HTML supported</span>
                      </div>
                      <textarea
                        ref={bodyRef}
                        rows={16}
                        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs leading-relaxed"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder="HTML content"
                      />
                    </div>

                    {/* Variables Insertion Grid */}
                    <div>
                      <p className="text-[13px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Available Placeholders</p>
                      <p className="text-[12px] text-neutral-500 mb-2">Click placeholder below to insert it at cursor position:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplate.variables.map((v) => (
                          <div key={v} className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-1">
                            <button
                              type="button"
                              onClick={() => insertVariable(v, 'subject')}
                              className="px-1.5 py-0.5 text-[13px] font-mono font-medium hover:bg-neutral-200 rounded text-neutral-700"
                              title="Insert into Subject"
                            >
                              S
                            </button>
                            <span className="h-4 w-px bg-neutral-200 mx-0.5" />
                            <button
                              type="button"
                              onClick={() => insertVariable(v, 'body')}
                              className="px-1.5 py-0.5 text-[13px] font-mono font-bold hover:bg-neutral-200 rounded text-neutral-900"
                              title="Insert into HTML Body"
                            >
                              +{v}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview Area */}
                    <div className="pt-3 border-t border-neutral-100">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-900">Live Mock Preview</p>
                        <button
                          type="button"
                          onClick={() => setShowShowPreview(!showPreview)}
                          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 underline underline-offset-2"
                        >
                          {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                      </div>
                      {showPreview && (
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 max-h-96 overflow-y-auto shadow-inner">
                          <p className="text-xs text-neutral-500 border-b pb-2 mb-3">
                            <span className="font-bold">Subject:</span> {previewData.subject}
                          </p>
                          <div 
                            className="bg-white p-3 rounded-lg border border-neutral-200 text-xs overflow-x-auto scale-90 origin-top-left"
                            dangerouslySetInnerHTML={{ __html: previewData.body }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Send Template Test Email */}
                    <div className="pt-3 border-t border-neutral-100">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-900 mb-2">Send Real Template Test</p>
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 flex-1 !py-1.5 !text-xs"
                          value={testTemplateEmail}
                          onChange={(e) => setTestTemplateEmail(e.target.value)}
                          placeholder="e.g. recipient@gmail.com"
                          type="email"
                        />
                        <button
                          type="button"
                          onClick={handleSendTemplateTest}
                          disabled={templateTestBusy || !isSmtpConfigured}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                        >
                          {templateTestBusy ? 'Sending…' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center h-full min-h-[300px]">
                <FileText size={32} className="text-neutral-400 mb-3" />
                <p className="text-sm font-semibold text-neutral-900">No template selected</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                  Select a transactional email template from the list on the left to edit its layout, subject line, active status, and send real-time test emails.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

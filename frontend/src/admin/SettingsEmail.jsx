import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdToggle, EdNotice, EditorialEmpty, TableSkeleton, EditorialError,
  MonoStatus, ctl, ta, btnGhost, btnSolid,
} from './settings/chrome';

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
  const [err, setErr] = useState('');

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []); // eslint-disable-line

  const loadSettings = () => {
    api('/settings/admin', { token: auth.token })
      .then((d) => {
        setSettings(d.settings);
        setOriginalSettings(JSON.stringify(d.settings));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  };

  const loadTemplates = () => {
    api('/email-templates', { token: auth.token })
      .then((d) => { setTemplates(d.templates || []); })
      .catch(() => toast('Could not load email templates'));
  };

  const isSettingsDirty = settings && originalSettings && JSON.stringify(settings) !== originalSettings;

  const handleSettingsSave = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { integrations: settings.integrations } });
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
      const res = await api('/settings/test-email', { method: 'POST', token: auth.token, body: { to: testEmail.trim() } });
      if (res.ok) toast('Test email sent successfully! Please check your inbox.');
      else toast(res.error || 'Failed to send test email.');
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
        body: { subject: editSubject, bodyHTML: editBody, active: editActive },
      });
      toast('Template saved successfully.');
      setTemplates((prev) => prev.map((item) => item.templateKey === selectedTemplate.templateKey ? res.template : item));
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
      if (res.ok) toast('Real template test email sent successfully! Please check your inbox.');
      else toast(res.error || 'Failed to send template test email.');
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
      expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-PK'),
    };

    let sResult = subj;
    let bResult = body;
    for (const [k, v] of Object.entries(mockVars)) {
      sResult = sResult.replace(new RegExp(`{${k}}`, 'g'), v);
      bResult = bResult.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    return { subject: sResult, body: bResult };
  };

  if (!settings && !err) {
    return <AdminLayout title="Email"><PageHeader title="Email & Notifications" description="SMTP and transactional templates." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !settings) {
    return (
      <AdminLayout title="Email">
        <PageHeader title="Email & Notifications" description="SMTP and transactional templates." />
        <EditorialError title="Unable to load settings" description={err} onRetry={loadSettings} />
      </AdminLayout>
    );
  }

  const emailCfg = settings?.integrations?.email || { host: '', port: 587, secure: false, user: '', pass: '', from: '', adminAlert: '' };
  const setEmailValue = (k, v) => {
    setSettings((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, email: { ...emailCfg, [k]: v } },
    }));
  };

  const isSmtpConfigured = !!(emailCfg.host && emailCfg.user && emailCfg.pass);
  const previewData = selectedTemplate ? renderPreview(editSubject, editBody) : { subject: '', body: '' };

  return (
    <AdminLayout title="Email & Notifications">
      <PageHeader
        title="Email & Notifications"
        description="SMTP credentials, transactional templates and test send."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Email' }]}
      />

      {!isSmtpConfigured && (
        <EdNotice>
          SMTP is not fully set up. Templates can still be edited and previewed, but real transactional emails will not reach customers.
        </EdNotice>
      )}

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EdSection
            index={1}
            title="SMTP"
            action={
              <button type="button" onClick={handleSettingsSave} disabled={busy || !isSettingsDirty} className={btnSolid}>
                {busy ? 'Saving…' : 'Save SMTP'}
              </button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="adm-label mb-1.5 block">SMTP host</label>
                <input className={ctl} value={emailCfg.host || ''} onChange={(e) => setEmailValue('host', e.target.value)} placeholder="e.g. smtp.gmail.com" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">SMTP port</label>
                <input type="number" className={ctl} value={emailCfg.port || 587} onChange={(e) => setEmailValue('port', Number(e.target.value) || 587)} placeholder="e.g. 587" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Username</label>
                <input className={ctl} value={emailCfg.user || ''} onChange={(e) => setEmailValue('user', e.target.value)} placeholder="e.g. care@hushae.pk" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className={`${ctl} pr-10`} value={emailCfg.pass || ''} onChange={(e) => setEmailValue('pass', e.target.value)} placeholder="••••••••••••" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-black">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="adm-label mb-1.5 block">From address</label>
                <input className={ctl} value={emailCfg.from || ''} onChange={(e) => setEmailValue('from', e.target.value)} placeholder="e.g. HUSHAE <care@hushae.pk>" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Admin alert email</label>
                <input className={ctl} value={emailCfg.adminAlert || ''} onChange={(e) => setEmailValue('adminAlert', e.target.value)} placeholder="e.g. alert@hushae.pk" />
              </div>
            </div>
            <div className="mt-4">
              <EdToggle
                label="Use secure TLS (SSL/TLS)"
                description="Enable if your server requires direct SSL/TLS (usually port 465)."
                checked={!!emailCfg.secure}
                onChange={(v) => setEmailValue('secure', v)}
              />
            </div>
          </EdSection>

          <EdSection index={2} title="Test connection">
            <div className="flex flex-wrap gap-2">
              <input className={`${ctl} min-w-[180px] flex-1`} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="e.g. mytest@gmail.com" type="email" />
              <button type="button" onClick={handleSendTestEmail} disabled={testBusy || !isSmtpConfigured} className={btnSolid}>
                {testBusy ? 'Sending…' : 'Send test'}
              </button>
            </div>
          </EdSection>

          <EdSection index={3} title="Templates" description="System emails sent automatically from order actions.">
            {templates.length === 0 ? (
              <EditorialEmpty title="No templates" description="Transactional templates have not loaded yet." />
            ) : (
              <div>
                {templates.map((t) => (
                  <button
                    key={t.templateKey}
                    type="button"
                    onClick={() => handleTemplateClick(t)}
                    className={`adm-row-hover flex w-full items-center justify-between border-b border-[#F0F0F0] px-1 py-4 text-left last:border-0 ${selectedTemplate?.templateKey === t.templateKey ? 'bg-[#FAFAFA]' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-black">{t.name}</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[#AAAAAA]">/{t.templateKey} · {t.subject}</p>
                    </div>
                    <MonoStatus label={t.active !== false ? 'ACTIVE' : 'DISABLED'} dim={t.active === false} />
                  </button>
                ))}
              </div>
            )}
          </EdSection>
        </div>

        <div className="lg:col-span-5">
          {selectedTemplate ? (
            <EdSection
              index={4}
              title={selectedTemplate.name}
              action={<button type="button" onClick={handleTemplateSave} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save'}</button>}
            >
              <EdToggle label="Enable this email notification" checked={editActive} onChange={setEditActive} />
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="adm-label">Subject line</label>
                  <span className="font-mono text-[10px] text-white/25">{`{…} variables`}</span>
                </div>
                <input ref={subjectRef} className={ctl} value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="Subject Line" />
              </div>
              <div className="mt-4">
                <label className="adm-label mb-1.5 block">Template body (HTML)</label>
                <textarea ref={bodyRef} rows={16} className={`${ta} min-h-[240px] font-mono text-[11px]`} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
              </div>
              <div className="mt-4">
                <p className="adm-label mb-2">Placeholders</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedTemplate.variables || []).map((v) => (
                    <span key={v} className="inline-flex border border-[#EAEAEA]">
                      <button type="button" onClick={() => insertVariable(v, 'subject')} className="px-1.5 py-0.5 font-mono text-[10px] text-[#777777] hover:text-black" title="Insert into Subject">S</button>
                      <button type="button" onClick={() => insertVariable(v, 'body')} className="border-l border-[#EAEAEA] px-1.5 py-0.5 font-mono text-[10px] text-[#333333] hover:text-black" title="Insert into HTML Body">+{v}</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-[#EAEAEA] pt-4">
                <button type="button" onClick={() => setShowShowPreview(!showPreview)} className={btnGhost}>
                  {showPreview ? 'Hide preview' : 'Show preview'}
                </button>
                {showPreview && (
                  <div className="mt-3 max-h-96 overflow-y-auto border border-[#EAEAEA] p-4">
                    <p className="mb-3 border-b border-[#EAEAEA] pb-2 text-[12px] text-[#999999]">
                      Subject: <span className="text-[#333333]">{previewData.subject}</span>
                    </p>
                    <div className="overflow-x-auto bg-white p-3 text-xs text-black" dangerouslySetInnerHTML={{ __html: previewData.body }} />
                  </div>
                )}
              </div>
              <div className="mt-6 border-t border-[#EAEAEA] pt-4">
                <p className="adm-label mb-2">Send real template test</p>
                <div className="flex flex-wrap gap-2">
                  <input className={`${ctl} min-w-[160px] flex-1`} value={testTemplateEmail} onChange={(e) => setTestTemplateEmail(e.target.value)} placeholder="e.g. recipient@gmail.com" type="email" />
                  <button type="button" onClick={handleSendTemplateTest} disabled={templateTestBusy || !isSmtpConfigured} className={btnSolid}>
                    {templateTestBusy ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </EdSection>
          ) : (
            <EditorialEmpty title="No template selected" description="Select a transactional email template to edit its subject, layout and active status." />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

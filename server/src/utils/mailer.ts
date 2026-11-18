import nodemailer, { Transporter } from 'nodemailer';

// Environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'info@atriowings.in';
// Hostinger uses the exact application password as provided
const SMTP_PASS = process.env.SMTP_PASS || 'gi11-9zp4-haoz-nifl';
const SMTP_FROM = process.env.SMTP_FROM || `Atriowings Technologies <${SMTP_USER}>`;
export const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || SMTP_USER;

let transporter: Transporter | null = null;

/**
 * Get or create the Nodemailer transporter instance
 */
export function getMailTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporter;
}

/**
 * Verify SMTP connection configuration
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const t = getMailTransporter();
    await t.verify();
    return {
      success: true,
      message: `SMTP Connected successfully to ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`,
    };
  } catch (error: any) {
    console.error('SMTP Connection verification failed:', error);
    return {
      success: false,
      message: error?.message || 'Failed to connect to SMTP server',
    };
  }
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: any;
    path?: string;
    contentType?: string;
  }>;
}

/**
 * Core sendEmail function with error handling and fallback
 */
export async function sendEmail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const t = getMailTransporter();
    const mailOptions = {
      from: SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      replyTo: options.replyTo || SMTP_USER,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };

    const info = await t.sendMail(mailOptions);
    console.log(`[SMTP Mailer] Email sent: "${options.subject}" to [${Array.isArray(options.to) ? options.to.join(', ') : options.to}] | MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Mailer Error] Failed to send email "${options.subject}" to [${options.to}]:`, err?.message || err);
    return { success: false, error: err?.message || 'Failed to dispatch email' };
  }
}

export interface WrapEmailOptions {
  preheader?: string;
  badge?: string;
  subtitle?: string;
}

/**
 * Base Responsive HTML Email Wrapper styled with official Atriowings brand identity:
 * Primary Blue: #3066BE | Teal: #119DA4 | Light Aqua: #80DED9 | Deep Navy: #152544
 */
function wrapEmailHtml(content: string, optionsOrPreheader: string | WrapEmailOptions = ''): string {
  const options: WrapEmailOptions =
    typeof optionsOrPreheader === 'string'
      ? { preheader: optionsOrPreheader }
      : optionsOrPreheader;

  const preheader = options.preheader || '';
  const badge = options.badge || 'ATRIOWINGS NETWORK';
  const subtitle = options.subtitle || 'GROWTH NETWORK &amp; IT SOLUTIONS';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atriowings Technologies</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(21, 37, 68, 0.08);
    }
    .brand-top-bar {
      height: 4px;
      background: linear-gradient(90deg, #119DA4 0%, #80DED9 50%, #3066BE 100%);
    }
    .header {
      background: #152544;
      background: linear-gradient(135deg, #0d1b32 0%, #152544 60%, #1e3a8a 100%);
      padding: 26px 28px 22px 28px;
      text-align: left;
    }
    .header-logo-text {
      font-size: 21px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.4px;
      display: block;
      line-height: 1.2;
    }
    .header-sub-text {
      font-size: 10px;
      font-weight: 700;
      color: #80DED9;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      display: block;
      margin-top: 3px;
    }
    .badge-pill {
      display: inline-block;
      background-color: rgba(17, 157, 164, 0.18);
      border: 1px solid rgba(128, 222, 217, 0.45);
      padding: 4px 12px;
      border-radius: 9999px;
      color: #AEECEF;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .body {
      padding: 32px 28px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 28px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      text-align: center;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      background-color: #3066BE;
      color: #ffffff !important;
      padding: 13px 26px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      margin: 16px 0;
      box-shadow: 0 4px 12px rgba(48, 102, 190, 0.25);
    }
    .card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      margin: 18px 0;
    }
    .highlight {
      color: #3066BE;
      font-weight: 700;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 13px;
    }
    table.data-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    table.data-table td.label {
      width: 35%;
      color: #64748b;
      font-weight: 600;
      font-size: 12px;
    }
    table.data-table td.val {
      width: 65%;
      color: #152544;
      font-weight: 700;
    }
    a {
      color: #3066BE;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="container">
    <div class="brand-top-bar"></div>
    <div class="header">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="vertical-align: middle;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align: middle; padding-right: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #3066BE 0%, #119DA4 100%); text-align: center; line-height: 40px; color: #ffffff; font-size: 18px; font-weight: 800; box-shadow: 0 4px 10px rgba(17, 157, 164, 0.35);">
                    &#10042;
                  </div>
                </td>
                <td style="vertical-align: middle;">
                  <span class="header-logo-text">Atriowings Technologies</span>
                  <span class="header-sub-text">${subtitle}</span>
                </td>
              </tr>
            </table>
          </td>
          ${badge ? `
          <td style="text-align: right; vertical-align: middle;">
            <span class="badge-pill">${badge}</span>
          </td>` : ''}
        </tr>
      </table>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <div style="margin-bottom: 6px;">
        <strong style="color: #152544; font-size: 12px;">Atriowings Technologies India Private Limited</strong><br>
        <span style="color: #64748b; font-size: 11px;">Growth Associate Network &amp; Commercial IT Solutions</span>
      </div>
      <div style="margin: 6px 0; color: #64748b; font-size: 11px;">
        Official Support: <a href="mailto:info@atriowings.in" style="color: #3066BE; text-decoration: none; font-weight: 600;">info@atriowings.in</a> &bull; Phone: +91 8825948859
      </div>
      <div style="margin-top: 8px; font-size: 10px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} Atriowings Technologies. All rights reserved. &bull; Ref: ATW-${Date.now().toString(36).toUpperCase()}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Public Contact Inquiry - Admin Alert
 */
export async function sendContactInquiryAdminAlert(data: {
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  subject?: string | null;
  message: string;
  ip?: string;
}): Promise<void> {
  const content = `
    <h2 style="font-size: 19px; color: #152544; margin-top: 0; font-weight: 800;">New Prospective Client Inquiry</h2>
    <p style="color: #475569;">A new commercial contact inquiry has just been submitted through the public Atriowings portal.</p>
    
    <div class="card" style="border-left: 4px solid #3066BE;">
      <table class="data-table">
        <tr>
          <td class="label">Client Name:</td>
          <td class="val">${data.name}</td>
        </tr>
        <tr>
          <td class="label">Email Address:</td>
          <td class="val"><a href="mailto:${data.email}" style="color: #3066BE;">${data.email}</a></td>
        </tr>
        <tr>
          <td class="label">Phone Number:</td>
          <td class="val">${data.phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td class="label">Company / Brand:</td>
          <td class="val">${data.companyName || 'Not specified'}</td>
        </tr>
        <tr>
          <td class="label">Inquiry Subject:</td>
          <td class="val" style="color: #3066BE;">${data.subject || 'General Inquiry'}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 14px; margin-bottom: 6px; color: #152544; font-weight: 700;">Client Message / Scope Description:</h3>
    <div style="background-color: #f8fafc; border-left: 4px solid #119DA4; padding: 14px; font-size: 13px; line-height: 1.6; color: #1e293b; border-radius: 6px;">
      ${data.message.replace(/\n/g, '<br>')}
    </div>

    <p style="margin-top: 20px; font-size: 11px; color: #64748b;">
      Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br>
      IP Address: ${data.ip || 'Unknown'}
    </p>
  `;

  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    replyTo: data.email,
    subject: `[New Inquiry] ${data.subject || 'Client Contact'} - ${data.name}${data.companyName ? ` (${data.companyName})` : ''}`,
    html: wrapEmailHtml(content, {
      preheader: `New contact submission from ${data.name}`,
      badge: 'CLIENT INQUIRY',
    }),
  });
}

/**
 * 2. Public Contact Inquiry - Auto Confirmation to Visitor
 */
export async function sendContactInquiryConfirmation(data: {
  name: string;
  email: string;
  subject?: string | null;
}): Promise<void> {
  const content = `
    <h2 style="font-size: 19px; color: #152544; margin-top: 0; font-weight: 800;">Thank you for reaching out, ${data.name}!</h2>
    <p style="color: #475569;">We have successfully received your inquiry regarding <strong>"${data.subject || 'our software & growth solutions'}"</strong>.</p>
    
    <p style="color: #334155;">Our business strategy and technical consulting team is reviewing your requirements. A senior associate from Atriowings Technologies will connect with you within <strong>2 to 4 business hours</strong>.</p>

    <div class="card" style="background-color: #edf4fc; border: 1px solid #6D96C5; border-left: 4px solid #3066BE;">
      <h4 style="margin: 0 0 8px 0; color: #152544; font-size: 13px; font-weight: 700;">Need urgent consultation?</h4>
      <p style="margin: 0; color: #334155; font-size: 12px; line-height: 1.5;">
        Feel free to call our executive team directly at <strong>+91 8825948859</strong> or email <a href="mailto:info@atriowings.in" style="color: #3066BE; font-weight: 600;">info@atriowings.in</a>.
      </p>
    </div>

    <p style="font-size: 13px; color: #475569; margin-top: 20px;">
      Best regards,<br>
      <strong style="color: #152544;">Business Relations &amp; Client Services</strong><br>
      Atriowings Technologies India Pvt. Ltd.
    </p>
  `;

  await sendEmail({
    to: data.email,
    subject: `We've received your inquiry - Atriowings Technologies`,
    html: wrapEmailHtml(content, {
      preheader: `Thank you for contacting Atriowings Technologies`,
      badge: 'INQUIRY CONFIRMED',
    }),
  });
}

/**
 * 3. BGA Registration - Welcome Email to Associate
 */
export async function sendBgaWelcomeEmail(associate: {
  id: string;
  name: string;
  email: string;
  mobile: string;
}): Promise<void> {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const loginUrl = `${clientUrl}/login`;

  const content = `
    <h2 style="font-size: 20px; color: #152544; margin-top: 0; font-weight: 800;">
      Welcome to Atriowings Growth Associate Portal, ${associate.name}!
    </h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
      Congratulations on registering as an authorized <strong>Business Growth Associate (BGA)</strong> with Atriowings Technologies.
    </p>
    
    <div class="card" style="border-left: 4px solid #119DA4;">
      <table class="data-table">
        <tr>
          <td class="label">Associate ID:</td>
          <td class="val" style="font-family: monospace; color: #3066BE; font-weight: 800; font-size: 13px;">${associate.id}</td>
        </tr>
        <tr>
          <td class="label">Registered Name:</td>
          <td class="val">${associate.name}</td>
        </tr>
        <tr>
          <td class="label">Registered Email:</td>
          <td class="val"><a href="mailto:${associate.email}" style="color: #3066BE;">${associate.email}</a></td>
        </tr>
        <tr>
          <td class="label">Registered Mobile:</td>
          <td class="val">${associate.mobile}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 14px; color: #152544; font-weight: 700; margin-top: 24px;">Next Steps to Activate Your Associate Account:</h3>
    <ol style="padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
      <li>Log in to your <strong>BGA Associate Portal</strong> using your registered email and password.</li>
      <li>Navigate to <strong>My Profile &amp; KYC</strong> to complete your Identity (PAN &amp; Aadhaar) and Bank verification.</li>
      <li>Start registering clients and submitting commercial project scopes to earn direct commissions.</li>
    </ol>

    <div style="text-align: center; margin: 26px 0;">
      <a href="${loginUrl}" class="btn">Log In to BGA Associate Portal &rarr;</a>
    </div>

    <p style="font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px; margin-top: 20px;">
      If you did not register for this account, please immediately contact our security desk at <a href="mailto:info@atriowings.in" style="color: #3066BE; font-weight: 600;">info@atriowings.in</a>.
    </p>
  `;

  await sendEmail({
    to: associate.email,
    subject: `Welcome to Atriowings Growth Associate Portal - Account Created`,
    html: wrapEmailHtml(content, {
      preheader: `Your BGA Associate Account has been created`,
      badge: 'ASSOCIATE ONBOARDING',
    }),
  });
}

/**
 * 4. BGA Registration - Admin Alert
 */
export async function sendBgaRegistrationAdminAlert(associate: {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city?: string | null;
  state?: string | null;
}): Promise<void> {
  const content = `
    <h2 style="font-size: 19px; color: #152544; margin-top: 0; font-weight: 800;">New BGA Associate Registration</h2>
    <p style="color: #475569;">A new associate has registered on the platform and awaits initial verification.</p>
    
    <div class="card" style="border-left: 4px solid #3066BE;">
      <table class="data-table">
        <tr>
          <td class="label">Associate Name:</td>
          <td class="val">${associate.name}</td>
        </tr>
        <tr>
          <td class="label">Associate ID:</td>
          <td class="val" style="font-family: monospace; color: #3066BE; font-weight: 800;">${associate.id}</td>
        </tr>
        <tr>
          <td class="label">Email Address:</td>
          <td class="val"><a href="mailto:${associate.email}" style="color: #3066BE;">${associate.email}</a></td>
        </tr>
        <tr>
          <td class="label">Mobile Phone:</td>
          <td class="val">${associate.mobile}</td>
        </tr>
        <tr>
          <td class="label">Location:</td>
          <td class="val">${[associate.city, associate.state].filter(Boolean).join(', ') || 'Not provided'}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #334155;">
      You can review this associate's profile and manage permissions in the <strong>Admin Portal &rarr; Growth Associates</strong> directory.
    </p>
  `;

  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject: `[New Associate] ${associate.name} has registered as BGA`,
    html: wrapEmailHtml(content, {
      preheader: `New Associate Registration: ${associate.name}`,
      badge: 'ADMIN ALERT',
    }),
  });
}

/**
 * 5. KYC Status Update Email to Associate
 */
export async function sendKycStatusEmail(associate: {
  name: string;
  email: string;
  status: 'APPROVED' | 'REJECTED';
  remarks?: string | null;
}): Promise<void> {
  const isApproved = associate.status === 'APPROVED';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const content = `
    <h2 style="font-size: 19px; color: #152544; margin-top: 0; font-weight: 800;">
      KYC Verification Status: <span style="color: ${isApproved ? '#059669' : '#dc2626'};">${isApproved ? 'Approved &amp; Verified' : 'Action Required / Rejected'}</span>
    </h2>
    <p>Dear ${associate.name},</p>
    <p style="color: #475569; line-height: 1.6;">
      ${isApproved 
        ? 'Your KYC documents and profile verification have been <strong>approved</strong> by Atriowings Technologies Administration. Your account is now fully active for commercial transactions and commission payouts.' 
        : 'Your KYC submission was reviewed by Administration and could not be approved at this time.'}
    </p>

    ${associate.remarks ? `
      <div class="card" style="border-left: 4px solid ${isApproved ? '#059669' : '#dc2626'};">
        <strong style="color: #152544; font-size: 12px; text-transform: uppercase;">Reviewer Remarks:</strong>
        <p style="margin: 6px 0 0; color: #334155; font-size: 13px;">${associate.remarks}</p>
      </div>
    ` : ''}

    <div style="text-align: center; margin: 26px 0;">
      <a href="${clientUrl}/login" class="btn" style="background-color: ${isApproved ? '#119DA4' : '#3066BE'};">
        Open Associate Portal &rarr;
      </a>
    </div>
  `;

  await sendEmail({
    to: associate.email,
    subject: `KYC Verification Update: ${isApproved ? 'Approved' : 'Attention Required'} - Atriowings BGA`,
    html: wrapEmailHtml(content, {
      preheader: `KYC status update for ${associate.name}`,
      badge: 'KYC COMPLIANCE',
    }),
  });
}

/**
 * 6. Global Password Reset Email
 */
export async function sendPasswordResetEmail(data: {
  name: string;
  email: string;
  resetLink: string;
  ip?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const content = `
    <h2 style="font-size: 20px; color: #152544; margin-top: 0; font-weight: 800;">Password Reset Request</h2>
    <p>Dear ${data.name},</p>
    <p style="color: #475569; line-height: 1.6;">
      We received an authorized request to reset the password for your account associated with 
      <strong>${data.email}</strong> on the Atriowings Enterprise Platform.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${data.resetLink}" class="btn">
        Reset Account Password &rarr;
      </a>
    </div>

    <div class="card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 600;">
        If the button above does not work, copy and paste this direct link into your browser:
      </p>
      <p style="margin: 0; font-size: 11px; word-break: break-all; color: #3066BE; font-family: monospace;">
        ${data.resetLink}
      </p>
    </div>

    <div class="card" style="border-left: 4px solid #f59e0b; background-color: #fffbeb; padding: 14px; margin-top: 20px;">
      <strong style="color: #92400e; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px;">
        Security Notice &amp; Expiration
      </strong>
      <ul style="margin: 4px 0 0; padding-left: 18px; color: #78350f; font-size: 12px; line-height: 1.6;">
        <li>This password recovery link is strictly <strong>single-use</strong> and will automatically expire in <strong>30 minutes</strong>.</li>
        <li>Once used, or if a new link is requested, any prior reset links become completely invalid.</li>
        <li>If you did not initiate this request, you can safely ignore this email. Your current password remains completely secure and unchanged.</li>
      </ul>
    </div>

    <p style="margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
      Requested on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
    </p>
  `;

  return await sendEmail({
    to: data.email,
    subject: 'Action Required: Reset Your Atriowings Account Password',
    html: wrapEmailHtml(content, {
      preheader: `Password reset instructions for ${data.name}`,
      badge: 'SECURITY ADVISORY',
    }),
  });
}


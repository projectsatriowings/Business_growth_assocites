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

/**
 * Base Responsive HTML Email Wrapper
 */
function wrapEmailHtml(content: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atriowings Technologies</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); padding: 32px 28px; text-align: left; }
    .logo-badge { display: inline-block; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; color: #a5b4fc; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #cbd5e1; font-size: 13px; }
    .body { padding: 32px 28px; font-size: 14px; line-height: 1.6; color: #334155; }
    .footer { background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
    .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 16px 0; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 18px 0; }
    .highlight { color: #4f46e5; font-weight: 700; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    table.data-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    table.data-table td.label { width: 35%; color: #64748b; font-weight: 600; }
    table.data-table td.val { width: 65%; color: #0f172a; font-weight: 700; }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="container">
    <div class="header">
      <div class="logo-badge">Atriowings Technologies</div>
      <h1>Enterprise Management Portal</h1>
      <p>Official Notification &amp; Communications Gateway</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <strong>Atriowings Technologies Pvt. Ltd.</strong><br>
      Official Support: <a href="mailto:info@atriowings.in" style="color: #4f46e5; text-decoration: none;">info@atriowings.in</a> | Phone: +91 8825948859<br>
      Plot No 8, Tholkappiar Street, Pammal, Chennai, Tamil Nadu - 600075<br>
      &copy; ${new Date().getFullYear()} Atriowings Technologies. All rights reserved.
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
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">New Prospective Client Inquiry</h2>
    <p>A new contact inquiry has just been submitted through the public Atriowings portal.</p>
    
    <div class="card">
      <table class="data-table">
        <tr>
          <td class="label">Client Name:</td>
          <td class="val">${data.name}</td>
        </tr>
        <tr>
          <td class="label">Email Address:</td>
          <td class="val"><a href="mailto:${data.email}" style="color: #4f46e5;">${data.email}</a></td>
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
          <td class="val">${data.subject || 'General Inquiry'}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 14px; margin-bottom: 6px; color: #0f172a;">Client Message / Scope Description:</h3>
    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px; font-size: 13px; line-height: 1.6; color: #1e293b; border-radius: 4px;">
      ${data.message.replace(/\n/g, '<br>')}
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
      Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br>
      IP Address: ${data.ip || 'Unknown'}
    </p>
  `;

  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    replyTo: data.email,
    subject: `[New Inquiry] ${data.subject || 'Client Contact'} - ${data.name}${data.companyName ? ` (${data.companyName})` : ''}`,
    html: wrapEmailHtml(content, `New contact submission from ${data.name}`),
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
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Thank you for reaching out, ${data.name}!</h2>
    <p>We have successfully received your inquiry regarding <strong>"${data.subject || 'our software & growth solutions'}"</strong>.</p>
    
    <p>Our business strategy and technical consulting team is reviewing your requirements. A senior associate from Atriowings Technologies will connect with you within <strong>2 to 4 business hours</strong>.</p>

    <div class="card" style="background-color: #eff6ff; border-color: #bfdbfe;">
      <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 13px;">Need urgent consultation?</h4>
      <p style="margin: 0; color: #1e3a8a; font-size: 12px;">
        Feel free to call our executive team directly at <strong>+91 8825948859</strong> or email <a href="mailto:info@atriowings.in" style="color: #2563eb;">info@atriowings.in</a>.
      </p>
    </div>

    <p style="font-size: 13px; color: #475569;">
      Best regards,<br>
      <strong>Business Relations &amp; Client Services</strong><br>
      Atriowings Technologies Pvt. Ltd.
    </p>
  `;

  await sendEmail({
    to: data.email,
    subject: `We've received your inquiry - Atriowings Technologies`,
    html: wrapEmailHtml(content, `Thank you for contacting Atriowings Technologies`),
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
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Welcome to Atriowings Growth Associate Portal, ${associate.name}!</h2>
    <p>Congratulations on registering as an authorized <strong>Business Growth Associate (BGA)</strong> with Atriowings Technologies.</p>
    
    <div class="card">
      <table class="data-table">
        <tr>
          <td class="label">Associate ID:</td>
          <td class="val">${associate.id}</td>
        </tr>
        <tr>
          <td class="label">Registered Name:</td>
          <td class="val">${associate.name}</td>
        </tr>
        <tr>
          <td class="label">Registered Email:</td>
          <td class="val">${associate.email}</td>
        </tr>
        <tr>
          <td class="label">Registered Mobile:</td>
          <td class="val">${associate.mobile}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 14px; color: #0f172a;">Next Steps to Activate Your Associate Account:</h3>
    <ol style="padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.7;">
      <li>Log in to your <strong>BGA Associate Portal</strong> using your registered email and password.</li>
      <li>Navigate to <strong>My Profile &amp; KYC</strong> to complete your Identity (PAN &amp; Aadhaar) and Bank verification.</li>
      <li>Start registering clients and submitting commercial project scopes to earn direct commissions.</li>
    </ol>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" class="btn">Log In to BGA Associate Portal &rarr;</a>
    </div>

    <p style="font-size: 12px; color: #64748b;">
      If you did not register for this account, please immediately contact our security desk at <a href="mailto:info@atriowings.in" style="color: #4f46e5;">info@atriowings.in</a>.
    </p>
  `;

  await sendEmail({
    to: associate.email,
    subject: `Welcome to Atriowings Growth Associate Portal - Account Created`,
    html: wrapEmailHtml(content, `Your BGA Associate Account has been created`),
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
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">New BGA Associate Registration</h2>
    <p>A new associate has registered on the platform and awaits initial verification.</p>
    
    <div class="card">
      <table class="data-table">
        <tr>
          <td class="label">Associate Name:</td>
          <td class="val">${associate.name}</td>
        </tr>
        <tr>
          <td class="label">Associate ID:</td>
          <td class="val">${associate.id}</td>
        </tr>
        <tr>
          <td class="label">Email Address:</td>
          <td class="val"><a href="mailto:${associate.email}" style="color: #4f46e5;">${associate.email}</a></td>
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
    html: wrapEmailHtml(content, `New Associate Registration: ${associate.name}`),
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
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">
      KYC Verification Status: <span style="color: ${isApproved ? '#059669' : '#dc2626'};">${isApproved ? 'Approved &amp; Verified' : 'Action Required / Rejected'}</span>
    </h2>
    <p>Dear ${associate.name},</p>
    <p>
      ${isApproved 
        ? 'Your KYC documents and profile verification have been <strong>approved</strong> by Atriowings Technologies Administration. Your account is now fully active for commercial transactions and commission payouts.' 
        : 'Your KYC submission was reviewed by Administration and could not be approved at this time.'}
    </p>

    ${associate.remarks ? `
      <div class="card" style="border-left: 4px solid ${isApproved ? '#059669' : '#dc2626'};">
        <strong style="color: #0f172a; font-size: 12px; text-transform: uppercase;">Reviewer Remarks:</strong>
        <p style="margin: 6px 0 0; color: #334155; font-size: 13px;">${associate.remarks}</p>
      </div>
    ` : ''}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${clientUrl}/login" class="btn" style="background-color: ${isApproved ? '#059669' : '#4f46e5'};">
        Open Associate Portal &rarr;
      </a>
    </div>
  `;

  await sendEmail({
    to: associate.email,
    subject: `KYC Verification Update: ${isApproved ? 'Approved' : 'Attention Required'} - Atriowings BGA`,
    html: wrapEmailHtml(content, `KYC status update for ${associate.name}`),
  });
}

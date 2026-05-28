import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export type EmailTemplate =
  | 'email-verify'
  | 'password-reset'
  | 'welcome'
  | 'application-received'
  | 'application-received-employer'
  | 'application-status-changed'
  | 'eor-contract-activated'
  | 'payroll-processed'
  | 'leave-decision'
  | 'job-match';

interface EmailParams {
  to: string;
  subject: string;
  template?: EmailTemplate;
  data?: Record<string, unknown>;
  html?: string;
  text?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(config: ConfigService) {
    this.fromEmail = config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@annexworkforce.com');
    // The frontend URL for building links inside emails
    this.appUrl =
      config.get<string>('WEB_APP_URL') ||
      config.get<string>('NEXT_PUBLIC_APP_URL') ||
      'http://localhost:3000';

    const sendgridKey = config.get<string>('SENDGRID_API_KEY');

    if (sendgridKey && sendgridKey !== 'REPLACE_ME_WITH_SENDGRID_KEY') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: { user: 'apikey', pass: sendgridKey },
      });
      this.logger.log('📧 Using SendGrid SMTP');
    } else {
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('SMTP_HOST', 'localhost'),
        port: parseInt(config.get<string>('SMTP_PORT', '1025'), 10),
        ignoreTLS: true,
      });
      this.logger.log('📧 Using local SMTP (MailHog at localhost:8025) — set SENDGRID_API_KEY for production');
    }
  }

  async sendEmail(params: EmailParams): Promise<void> {
    const html = params.html ?? this.renderTemplate(params.template, params.data);
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html,
        text: params.text,
      });
      this.logger.log(`✉️  Sent "${params.subject}" → ${params.to}`);
    } catch (e) {
      this.logger.error(`Failed to send email to ${params.to}: ${(e as Error).message}`);
      throw e;
    }
  }

  async sendSms(to: string, body: string): Promise<void> {
    // Twilio integration goes here — kept stub for MVP
    this.logger.debug(`SMS stub → ${to}: ${body.slice(0, 80)}`);
  }

  // ─── HTML rendering ──────────────────────────────────────────

  private layout(title: string, body: string): string {
    return `
<!doctype html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;background:#faf8f3;">
  <div style="border-bottom:2px solid #0a4d3c;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="margin:0;color:#0a4d3c;font-size:22px;font-family:Georgia,serif;">Annex Workforce</h1>
  </div>
  <h2 style="font-size:18px;font-family:Georgia,serif;color:#0a1f17;">${title}</h2>
  ${body}
  <hr style="margin:32px 0;border:none;border-top:1px solid #e8e2d3;" />
  <p style="font-size:12px;color:#888;">Annex Workforce · Trusted talent infrastructure for Africa<br />
  If you didn't expect this email, you can safely ignore it.</p>
</body></html>`;
  }

  private button(href: string, label: string): string {
    return `<p><a href="${href}" style="display:inline-block;background:#0a4d3c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">${label}</a></p>`;
  }

  private renderTemplate(template: EmailTemplate | undefined, data: Record<string, unknown> = {}): string {
    switch (template) {
      case 'email-verify':
        return this.layout(
          `Hi ${data.firstName ?? 'there'}, verify your email`,
          `<p>Welcome to Annex Workforce. Click below to verify your email address:</p>
           ${this.button(`${this.appUrl}/verify-email?token=${data.token}`, 'Verify email')}
           <p>This link expires in 24 hours. If you did not create an account, ignore this email.</p>`,
        );

      case 'password-reset':
        return this.layout(
          `Hi ${data.firstName ?? 'there'}, reset your password`,
          `<p>You requested a password reset. Click below to set a new password:</p>
           ${this.button(`${this.appUrl}/reset-password?token=${data.token}`, 'Reset password')}
           <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
        );

      case 'welcome':
        return this.layout(
          `Welcome to Annex Workforce, ${data.firstName}`,
          `<p>Your account is verified and active. You can now complete your profile, browse jobs, and start applying.</p>
           ${this.button(`${this.appUrl}/dashboard`, 'Go to dashboard')}
           <p>A few next steps:</p>
           <ul>
             <li>Complete your profile (skills, experience, education)</li>
             <li>Upload your resume</li>
             <li>Verify your identity to appear in more searches</li>
           </ul>`,
        );

      case 'application-received':
        return this.layout(
          `Application received — ${data.jobTitle}`,
          `<p>Hi ${data.firstName ?? 'there'},</p>
           <p>Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been received. We'll let you know as the employer reviews your application.</p>
           ${this.button(`${this.appUrl}/applications`, 'View my applications')}`,
        );

      case 'application-received-employer':
        return this.layout(
          `New applicant — ${data.jobTitle}`,
          `<p>You have a new applicant for <strong>${data.jobTitle}</strong>.</p>
           <p><strong>${data.candidateName}</strong>${data.candidateHeadline ? ` · ${data.candidateHeadline}` : ''}</p>
           ${data.candidateLocation ? `<p style="color:#666">Location: ${data.candidateLocation}</p>` : ''}
           ${this.button(`${this.appUrl}/employer/jobs/${data.jobId}`, 'Review applicant')}`,
        );

      case 'application-status-changed':
        return this.layout(
          `Update on your application: ${data.jobTitle}`,
          `<p>Hi ${data.firstName ?? 'there'},</p>
           <p>${data.companyName ?? 'The employer'} has moved your application for <strong>${data.jobTitle}</strong> to:</p>
           <p style="font-size:18px;color:#0a4d3c;text-transform:capitalize;"><strong>${(data.status as string)?.toLowerCase().replace(/_/g, ' ')}</strong></p>
           ${data.note ? `<p style="background:#f4ede0;padding:12px;border-radius:6px;">${data.note}</p>` : ''}
           ${this.button(`${this.appUrl}/applications`, 'View application')}`,
        );

      case 'eor-contract-activated':
        return this.layout(
          `Welcome to ${data.employerName} 🎉`,
          `<p>Hi ${data.firstName ?? 'there'},</p>
           <p>Your contract with <strong>${data.employerName}</strong> as <strong>${data.jobTitle}</strong> has been activated. Annex Workforce is now your Employer of Record — we handle payroll, taxes, and statutory compliance.</p>
           <p><strong>Start date:</strong> ${data.startDate}<br />
           <strong>Monthly gross:</strong> ${data.salary}</p>
           ${this.button(`${this.appUrl}/dashboard`, 'View your dashboard')}
           <p>You'll receive your first payslip after the next monthly payroll cycle.</p>`,
        );

      case 'payroll-processed':
        return this.layout(
          `Your ${data.period} payslip is ready`,
          `<p>Hi ${data.firstName ?? 'there'},</p>
           <p>Your payroll for <strong>${data.period}</strong> has been processed.</p>
           <p><strong>Net pay:</strong> ${data.netSalary}</p>
           <p style="color:#666;font-size:13px;">PAYE, Pension, and NHF have been deducted and remitted on your behalf.</p>
           ${this.button(`${this.appUrl}/payslips`, 'View payslip')}`,
        );

      case 'leave-decision':
        const isApproved = data.decision === 'APPROVED';
        return this.layout(
          `Leave request ${isApproved ? 'approved' : 'declined'}`,
          `<p>Hi ${data.firstName ?? 'there'},</p>
           <p>Your ${(data.type as string)?.toLowerCase()} leave request for <strong>${data.startDate} – ${data.endDate}</strong> (${data.days} working days) has been <strong style="color:${isApproved ? '#047857' : '#b91c1c'};">${isApproved ? 'approved' : 'declined'}</strong>.</p>
           ${data.note ? `<p style="background:#f4ede0;padding:12px;border-radius:6px;"><strong>Manager note:</strong> ${data.note}</p>` : ''}
           ${this.button(`${this.appUrl}/leave`, 'View leave')}`,
        );

      case 'job-match':
        return this.layout(
          `New job match: ${data.jobTitle}`,
          `<p>A new role matches your profile:</p>
           <p><strong>${data.jobTitle}</strong> at ${data.companyName}</p>
           ${this.button(`${this.appUrl}/jobs/${data.jobId}`, 'View role')}`,
        );

      default:
        return this.layout('Notification', `<pre>${JSON.stringify(data, null, 2)}</pre>`);
    }
  }
}

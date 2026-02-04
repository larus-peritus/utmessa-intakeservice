/**
 * Email templates for POC Builder notifications (Icelandic)
 *
 * All templates return HTML email content
 */

/**
 * Escape HTML special characters to prevent XSS/injection in email templates
 *
 * @param str - The string to escape
 * @returns HTML-safe string
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface EmailTemplateData {
  title: string;
  token: string;
  receiptUrl: string;
  demoUrl?: string;
  repoUrl?: string;
  waitingQuestion?: string;
  reason?: string;
}

/**
 * Common email wrapper with Peritus branding
 */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="is">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POC Gervigreindasmiður</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #2563eb;">
                POC Gervigreindasmiður
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                UT messa 2026
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Keyrt af <a href="https://peritus.is" style="color: #2563eb; text-decoration: none;">Peritus</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Button component for emails
 */
function emailButton(text: string, url: string, color: string = '#2563eb'): string {
  return `
    <a href="${url}" style="display: inline-block; padding: 14px 28px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      ${text}
    </a>
  `;
}

/**
 * Email: Submission confirmation
 */
export function submissionConfirmationEmail(data: EmailTemplateData): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">
      Takk fyrir að senda inn hugmynd!
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
      Við höfum móttekið hugmyndina þína og hún er nú í biðröð:
    </p>
    <div style="background-color: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        "${escapeHtml(data.title)}"
      </p>
    </div>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
      Þú getur fylgst með stöðu hugmyndarinnar á kvittunarsíðunni þinni. Við munum senda þér tölvupóst þegar gervigreindin byrjar að vinna í hugmyndinni þinni.
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailButton('Skoða kvittun', data.receiptUrl)}
    </div>
    <p style="margin: 0; font-size: 14px; color: #94a3b8;">
      Vinsamlegast geymdu þessa kvittun til að geta fylgst með framvindu.
    </p>
  `;

  return {
    subject: `Hugmynd móttekin: ${escapeHtml(data.title)}`,
    html: emailWrapper(content),
  };
}

/**
 * Email: POC has started building
 */
export function buildingStartedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">
      Prufuútgáfan þín er hafin!
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
      Gervigreindin er byrjuð að smíða prufuútgáfu af hugmyndinni þinni:
    </p>
    <div style="background-color: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        "${escapeHtml(data.title)}"
      </p>
    </div>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
      Þú getur fylgst með framvindu á kvittunarsíðunni þinni:
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailButton('Skoða framvindu', data.receiptUrl)}
    </div>
    <p style="margin: 0; font-size: 14px; color: #94a3b8;">
      Við munum senda þér tölvupóst þegar prufuútgáfan er tilbúin.
    </p>
  `;

  return {
    subject: `Prufuútgáfa hafin: ${escapeHtml(data.title)}`,
    html: emailWrapper(content),
  };
}

/**
 * Email: Waiting for user input
 */
export function waitingForInputEmail(data: EmailTemplateData): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b;">
      Við þurfum aðstoð þína!
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
      Gervigreindin er að vinna í prufuútgáfunni þinni en þarf svör við spurningu til að halda áfram:
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #92400e;">
        Spurning:
      </p>
      <p style="margin: 0; font-size: 16px; color: #1e293b;">
        ${escapeHtml(data.waitingQuestion || 'Vinsamlegast skoðaðu kvittunarsíðuna fyrir nánari upplýsingar.')}
      </p>
    </div>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
      Vinsamlegast farðu á kvittunarsíðuna til að svara:
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailButton('Svara spurningu', data.receiptUrl, '#f59e0b')}
    </div>
    <p style="margin: 0; font-size: 14px; color: #94a3b8;">
      Hugmynd: "${escapeHtml(data.title)}"
    </p>
  `;

  return {
    subject: `Svar þarf: ${escapeHtml(data.title)}`,
    html: emailWrapper(content),
  };
}

/**
 * Email: POC completed successfully
 */
export function completedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const linksSection = data.demoUrl || data.repoUrl ? `
    <div style="margin-bottom: 24px;">
      ${data.demoUrl ? `
        <div style="margin-bottom: 12px;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #475569;">Demo:</p>
          <a href="${data.demoUrl}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${data.demoUrl}</a>
        </div>
      ` : ''}
      ${data.repoUrl ? `
        <div>
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #475569;">Kóði:</p>
          <a href="${data.repoUrl}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${data.repoUrl}</a>
        </div>
      ` : ''}
    </div>
  ` : '';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; line-height: 64px;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </div>
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b; text-align: center;">
      Prufuútgáfan þín er tilbúin!
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6; text-align: center;">
      Gervigreindin hefur lokið við að smíða prufuútgáfu af hugmyndinni þinni:
    </p>
    <div style="background-color: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        "${escapeHtml(data.title)}"
      </p>
    </div>
    ${linksSection}
    <div style="text-align: center; margin-bottom: 24px;">
      ${data.demoUrl ? emailButton('Opna demo', data.demoUrl, '#16a34a') : emailButton('Skoða kvittun', data.receiptUrl, '#16a34a')}
    </div>
    <p style="margin: 0; font-size: 14px; color: #94a3b8; text-align: center;">
      Takk fyrir að nota POC Gervigreindasmiðinn á UT messu 2026!
    </p>
  `;

  return {
    subject: `Tilbúið: ${escapeHtml(data.title)}`,
    html: emailWrapper(content),
  };
}

/**
 * Email: POC failed
 */
export function failedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: #fee2e2; border-radius: 50%; line-height: 64px;">
        <span style="font-size: 32px;">✗</span>
      </div>
    </div>
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #1e293b; text-align: center;">
      Smíði mistókst
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6; text-align: center;">
      Því miður tókst ekki að ljúka smíði á prufuútgáfunni þinni:
    </p>
    <div style="background-color: #f1f5f9; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">
        "${escapeHtml(data.title)}"
      </p>
    </div>
    ${data.reason ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #991b1b;">
          Ástæða:
        </p>
        <p style="margin: 0; font-size: 14px; color: #1e293b;">
          ${escapeHtml(data.reason)}
        </p>
      </div>
    ` : ''}
    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6; text-align: center;">
      Þú getur skoðað nánari upplýsingar á kvittunarsíðunni:
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      ${emailButton('Skoða kvittun', data.receiptUrl)}
    </div>
    <p style="margin: 0; font-size: 14px; color: #94a3b8; text-align: center;">
      Ef þú hefur spurningar, vinsamlegast leitaðu til starfsfólks á básnum.
    </p>
  `;

  return {
    subject: `Smíði mistókst: ${escapeHtml(data.title)}`,
    html: emailWrapper(content),
  };
}

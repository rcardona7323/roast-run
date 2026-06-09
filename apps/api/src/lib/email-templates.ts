/** Generates the weekly update HTML email */
export function weeklyUpdateHtml(opts: {
  orgName: string;
  subject: string;
  body: string;
  memberName: string;
  totalMiles: number;
  appUrl: string;
}): string {
  const { orgName, subject, body, memberName, totalMiles, appUrl } = opts;
  const bodyHtml = body
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : "<br>"))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#C8611A,#9E4712);border-radius:14px 14px 0 0;padding:32px 36px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">☕</div>
              <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:-.02em;">${orgName}</h1>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,.75);">Run Club Weekly Update</p>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background:#fff;padding:32px 36px;border-left:1px solid #E8DFD3;border-right:1px solid #E8DFD3;">
              <p style="margin:0 0 20px;font-size:16px;color:#4A4039;">Hey ${memberName} 👋</p>
              <div style="font-size:15px;color:#2A221D;line-height:1.65;">
                ${bodyHtml}
              </div>

              <!-- Miles badge -->
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:#FAF1E7;border:1px solid #FCEAE0;border-radius:12px;padding:16px 24px;text-align:center;">
                    <div style="font-size:13px;font-weight:700;color:#9A7A07;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;">Your Total Miles</div>
                    <div style="font-size:32px;font-weight:900;color:#C8611A;">${totalMiles.toFixed(1)} mi</div>
                  </td>
                </tr>
              </table>

              <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#C8611A,#9E4712);color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:15px;font-weight:700;">View My Progress →</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F5F0E9;border:1px solid #E8DFD3;border-top:none;border-radius:0 0 14px 14px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9E9590;">
                You're receiving this because you're a member of ${orgName} run club.<br/>
                <a href="${appUrl}" style="color:#C8611A;text-decoration:none;">Manage your account</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

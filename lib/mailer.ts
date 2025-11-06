import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const mailEnabled =
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM) &&
  !process.env.DISABLE_EMAIL;

let transporter: nodemailer.Transporter | null = null;

function ensureTransport() {
  if (!mailEnabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

type NotificationOptions = {
  to: string;
  studentName: string;
  className: string;
  logLevel: string;
  category: string;
  location: string;
  actionTaken?: string;
  note?: string;
  submitterEmail: string;
};

export async function sendTeacherNotification(options: NotificationOptions) {
  const transport = ensureTransport();
  if (!transport) return false;

  const subject = `[TrackTally] Incident logged for ${options.studentName}`;
  const lines = [
    `Student: ${options.studentName} (${options.className})`,
    `Logged by: ${options.submitterEmail}`,
    `Level: ${options.logLevel}`,
    `Category: ${options.category}`,
    `Location: ${options.location}`,
  ];

  if (options.actionTaken) {
    lines.push(`Action taken: ${options.actionTaken}`);
  }
  if (options.note) {
    lines.push("", "Note:", options.note);
  }

  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to: options.to,
      subject,
      text: lines.join("\n"),
    });
    return true;
  } catch (error) {
    console.error("Failed to send notification email", error);
    return false;
  }
}

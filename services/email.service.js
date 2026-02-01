const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✅ نتحقق مرة واحدة فقط
transporter.verify((err) => {
  if (err) {
    console.error('SMTP error:', err);
  } else {
    console.log('SMTP ready');
  }
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"Mushrif" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html
  });
}

module.exports = sendEmail;

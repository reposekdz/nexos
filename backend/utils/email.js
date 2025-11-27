const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Nexos" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

const emailTemplates = {
  verification: (token) => ({
    subject: 'Verify Your Email - Nexos',
    html: `
      <h1>Welcome to Nexos!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${process.env.CLIENT_URL}/verify-email/${token}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
  }),
  
  passwordReset: (token) => ({
    subject: 'Reset Your Password - Nexos',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${process.env.CLIENT_URL}/reset-password/${token}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `
  }),
  
  welcome: (username) => ({
    subject: 'Welcome to Nexos!',
    html: `
      <h1>Welcome ${username}!</h1>
      <p>Your account has been successfully created.</p>
      <p>Start exploring and connecting with others!</p>
    `
  })
};

module.exports = { sendEmail, emailTemplates };

<?php
declare(strict_types=1);

//接收邮件的邮箱
const GY_CONTACT_RECIPIENT = 'jiangn@cocreationsrv.co.jp';

// SMTP sender shown in the mail header. Usually use the same mailbox as the SMTP account.
const GY_CONTACT_FROM_EMAIL = 'info@gycompany.co.jp';
const GY_CONTACT_FROM_NAME = 'GY COMPANY Website';

// SMTP envelope sender used by MAIL FROM.
// Leave empty to use GY_SMTP_USERNAME automatically. If your SMTP provider rejects sending,
// set this to the authenticated mailbox address, for example support@example.com.
const GY_SMTP_ENVELOPE_FROM = '';

// SMTP server settings. Replace these values with the mail server account you will use.
// Example host: smtp.example.com
const GY_SMTP_HOST = 'afterservicecon.cfbx.jp';

// SMTP port. Common values:
// 465 = SSL/TLS, 587 = STARTTLS, 25 = no encryption or STARTTLS depending on server.
const GY_SMTP_PORT = 465;

// SMTP encryption mode: 'starttls', 'tls', or 'none'.
// Use 'starttls' for port 587, 'tls' for port 465.
const GY_SMTP_ENCRYPTION = 'tls';

// SMTP login account and password.
// Leave empty only for a server that explicitly allows unauthenticated relay.
const GY_SMTP_USERNAME = 'support@aegislinks.jp';
const GY_SMTP_PASSWORD = '.hi2C9E;MxBn42';

// Timeout in seconds for connecting to and communicating with the SMTP server.
const GY_SMTP_TIMEOUT = 15;

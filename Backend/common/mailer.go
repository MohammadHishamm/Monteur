package common

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Mailer struct {
	Host     string
	Port     string
	Username string
	Password string
}

type Email struct {
	To      string
	Subject string
	Body    string
}

var mailerInstance *Mailer

// InitMailer initializes the singleton Mailer once
func InitMailer() *Mailer {
	if mailerInstance != nil {
		return mailerInstance
	}

	err := godotenv.Load()
	if err != nil {
		log.Println(" Warning: .env file not loaded, relying on system env variables")
	}

	mailerInstance = &Mailer{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     os.Getenv("SMTP_PORT"),
		Username: os.Getenv("SMTP_USER"),
		Password: os.Getenv("SMTP_PASS"),
	}
	return mailerInstance
}

func (m *Mailer) Send(email Email) error {
	from := m.Username
	to := []string{email.To}

	msg := []byte("Subject: " + email.Subject + "\r\n" +
		"To: " + email.To + "\r\n" +
		"From: " + from + "\r\n" +
		"\r\n" + email.Body + "\r\n")

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg)
	if err != nil {
		return err
	}

	fmt.Println("Email sent successfully to:", email.To)
	return nil
}

func (m *Mailer) SendResetpassword(email string, token string) error {
	from := m.Username
	to := []string{email}

	// Create the password reset link
	resetLink := fmt.Sprintf("https://ariatoon.com/reset-password?token=%s", token)

	// Construct the email message
	subject := "Reset Your Ariatoon Password"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f2f0f6;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f2f0f6;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.2px;">Reset Your Password</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.95;">Secure your Ariatoon account</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                We received a request to reset your password for your <strong>Ariatoon</strong> account. If you made this request, click the button below to create a new password.
              </p>

              <p style="text-align:center;margin:22px 0;">
                <a href="%s" target="_blank" rel="noopener" style="display:inline-block;padding:14px 26px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;color:#ffffff;background:linear-gradient(90deg,#8a49f0 0%%,#6a0dad 100%%);box-shadow:0 6px 18px rgba(106,13,173,0.18);">
                  Reset Password
                </a>
              </p>

              <p style="margin:0 0 6px;font-size:13px;color:#666;">
                If the button doesn't work, copy and paste the following link into your browser:
              </p>
              <p style="word-break:break-all;margin:6px 0 0;font-size:12px;color:#6a0dad;">
                %s
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, resetLink, resetLink, time.Now().Year())

	// Build full RFC-822 message with headers
	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	// Authenticate
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)

	// Send the email
	err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg)
	if err != nil {
		return err
	}

	fmt.Println("Password reset email sent successfully to:", email)
	return nil
}

func (m *Mailer) SendEmailActivation(email, token string) error {
	from := m.Username
	to := []string{email}
	activationURL := fmt.Sprintf("https://ariatoon.com/auth/activation?token=%s", token)

	subject := "Activate Your Ariatoon Account"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f2f0f6;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f2f0f6;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:0.2px;">Welcome to Ariatoon</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.95;">Your manga world — one click away</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                Thanks for creating an account at <strong>Ariatoon</strong>. To finish setting up your account and start exploring manga, please confirm your email address by clicking the button below.
              </p>

              <p style="text-align:center;margin:22px 0;">
                <a href="%s" target="_blank" rel="noopener" style="display:inline-block;padding:14px 26px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;color:#ffffff;background:linear-gradient(90deg,#8a49f0 0%%,#6a0dad 100%%);box-shadow:0 6px 18px rgba(106,13,173,0.18);">
                  Activate your account
                </a>
              </p>

              <p style="margin:0 0 6px;font-size:13px;color:#666;">
                If the button doesn't work, copy and paste the following link into your browser:
              </p>
              <p style="word-break:break-all;margin:6px 0 0;font-size:12px;color:#6a0dad;">
                %s
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;line-height:1.5;">
                If you didn't create an Ariatoon account, you can safely ignore this email. This link will expire in 1 hour.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, activationURL, activationURL, time.Now().Year())

	// Build full RFC-822 message with headers
	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg); err != nil {
		return err
	}

	fmt.Println("Activation email sent successfully to:", email)
	return nil
}

func (m *Mailer) SendPaymentReceived(email string, amount int64) error {
	from := m.Username
	to := []string{email}

	subject := "Payment Received - Ariatoon"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f9f7fc;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f9f7fc;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:22px;font-weight:700;">Payment Received</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                Great news! You've just received your earnings from <strong>Ariatoon</strong>.
              </p>

              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;padding:16px 30px;border-radius:10px;background:linear-gradient(90deg,#8a49f0 0%%,#6a0dad 100%%);color:#fff;font-weight:700;font-size:20px;box-shadow:0 6px 18px rgba(106,13,173,0.18);">
                  %d Coins
                </div>
              </div>

              <p style="margin:0 0 10px;font-size:14px;color:#666;">
                The payment has been processed successfully. You can now check your account for confirmation.
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;">
                Thank you for your continued contributions to Ariatoon. Keep sharing your amazing manga!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, amount, time.Now().Year())

	// Build full message
	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg); err != nil {
		return err
	}

	fmt.Println("Payment received email sent successfully to:", email)
	return nil
}

func (m *Mailer) SendAnnouncementEmail(email, title, content string) error {
	from := m.Username
	to := []string{email}

	subject := "New Announcement - Ariatoon"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f9f7fc;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f9f7fc;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:22px;font-weight:700;">%s</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                We have a new announcement for you from <strong>Ariatoon</strong>:
              </p>

              <div style="padding:16px 20px;border-radius:10px;background:#f4f0fb;color:#333;font-size:15px;line-height:1.6;margin:24px 0;">
                %s
              </div>

              <p style="margin:0 0 10px;font-size:14px;color:#666;">
                Stay tuned for more updates and keep enjoying Ariatoon!
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;">
                Thank you for being a valued member of Ariatoon.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, title, content, time.Now().Year())

	// Build full message
	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg); err != nil {
		return err
	}

	fmt.Println("Announcement email sent successfully to:", email)
	return nil
}

func (m *Mailer) SendItemSoldNotification(email, buyerName, itemTitle, itemType string, amount int64) error {
	from := m.Username
	to := []string{email}

	subject := "Your Item Has Been Sold! - Ariatoon"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f9f7fc;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f9f7fc;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:22px;font-weight:700;">Your %s Has Been Sold!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                Great news! <strong>%s</strong> just purchased your %s titled <strong>%s</strong>.
              </p>

              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;padding:16px 30px;border-radius:10px;background:linear-gradient(90deg,#8a49f0 0%%,#6a0dad 100%%);color:#fff;font-weight:700;font-size:20px;box-shadow:0 6px 18px rgba(106,13,173,0.18);">
                  +%d Coins
                </div>
              </div>

              <p style="margin:0 0 10px;font-size:14px;color:#666;">
                The payment has been added to your balance. You can check your account for updated details.
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;">
                Keep sharing your amazing stories on Ariatoon. Congratulations on the sale!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, itemType, buyerName, itemType, itemTitle, amount, time.Now().Year())

	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg); err != nil {
		return err
	}

	fmt.Println("Item sold notification email sent successfully to:", email)
	return nil
}

func (m *Mailer) SendPurchaseConfirmation(email, itemTitle, itemType string, amount int64) error {
	from := m.Username
	to := []string{email}

	subject := "Purchase Confirmation - Ariatoon"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f9f7fc;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f9f7fc;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:22px;font-weight:700;">Purchase Confirmation</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                Thank you for your purchase! You’ve successfully bought the %s titled <strong>%s</strong>.
              </p>

              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;padding:16px 30px;border-radius:10px;background:linear-gradient(90deg,#8a49f0 0%%,#6a0dad 100%%);color:#fff;font-weight:700;font-size:20px;box-shadow:0 6px 18px rgba(106,13,173,0.18);">
                  -%d Coins
                </div>
              </div>

              <p style="margin:0 0 10px;font-size:14px;color:#666;">
                You can now access your purchased content anytime in your library.
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;">
                Enjoy your reading experience on Ariatoon!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, itemType, itemTitle, amount, time.Now().Year())

	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg); err != nil {
		return err
	}

	fmt.Println("Purchase confirmation email sent successfully to:", email)
	return nil
}

func (m *Mailer) SendWelcomeEmail(to string, name string) error {
	subject := "Welcome to Ariatoon World!"

	// HTML email body with inline CSS for proper rendering
	body := fmt.Sprintf(`
	<html>
	<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:Arial,sans-serif;color:#333;">
	  <div style="background-color:#ffffff;max-width:600px;margin:40px auto;padding:30px;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.1);">
	    <h1 style="color:#6a0dad;font-size:28px;margin-bottom:20px;">Hello %s, Welcome to Ariatoon World!</h1>
	    <p style="font-size:16px;line-height:1.5;margin-bottom:20px;">
	      We’re thrilled to have you join our community of manga enthusiasts! Explore your favorite series, discover new manga, and connect with fellow fans.
	    </p>
	    <p style="font-size:16px;line-height:1.5;margin-bottom:20px;">
	      To get started, click the button below to explore more and start your adventure:
	    </p>
	    <a href="http://localhost:3000/series/manga" style="display:inline-block;padding:12px 20px;background-color:#6a0dad;color:#ffffff;text-decoration:none;border-radius:5px;font-weight:bold;">
	      Explore more
	    </a>
	    <p style="font-size:16px;line-height:1.5;margin-top:30px;">
	      Happy reading!<br>Manga World
	    </p>
	  </div>
	</body>
	</html>
	`, name)

	email := Email{
		To:      to,
		Subject: subject,
		Body:    body,
	}

	// Send as HTML email
	from := m.Username
	toList := []string{to}
	msg := []byte("MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n" +
		"Subject: " + email.Subject + "\r\n" +
		"To: " + email.To + "\r\n" +
		"From: " + from + "\r\n\r\n" + email.Body)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, toList, msg); err != nil {
		return err
	}

	fmt.Println(" Welcome email sent to:", to)
	return nil
}

func (m *Mailer) SendPayPalPaymentConfirmation(email string, coins int64, amountUSD float64, orderID string) error {
	from := m.Username
	to := []string{email}

	subject := "Payment Successful - Your Balance Has Been Updated - Ariatoon"
	body := fmt.Sprintf(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f9f7fc;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f9f7fc;padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(106,13,173,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6a0dad 0%%,#9b5cf7 100%%);padding:28px;text-align:center;color:#fff;">
              <h1 style="margin:0;font-size:22px;font-weight:700;">Payment Successful!</h1>
              <p style="margin:6px 0 0;font-size:14px;opacity:0.95;">Your balance has been updated</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 32px 18px;color:#333;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">Hello,</p>

              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555;">
                Great news! Your PayPal payment was successful and your <strong>Ariatoon</strong> balance has been updated.
              </p>

              <div style="background:#faf6ff;border-radius:10px;padding:20px;margin:20px 0;">
                <div style="text-align:center;margin-bottom:16px;">
                  <div style="display:inline-block;padding:16px 30px;border-radius:10px;background:linear-gradient(90deg,#8a49f0 0%%,#6a0dad 100%%);color:#fff;font-weight:700;font-size:24px;box-shadow:0 6px 18px rgba(106,13,173,0.18);">
                    +%d Coins
                  </div>
                </div>
                <div style="text-align:center;color:#666;font-size:14px;">
                  <div style="margin-bottom:8px;"><strong>Amount Paid:</strong> $%.2f USD</div>
                  <div style="margin-bottom:8px;"><strong>Order ID:</strong> %s</div>
                  <div><strong>Payment Method:</strong> PayPal</div>
                </div>
              </div>

              <p style="margin:18px 0 10px;font-size:14px;color:#666;">
                Your coins have been added to your account balance. You can now use them to purchase your favorite manga and novels!
              </p>

              <hr style="border:none;border-top:1px solid #f0e7fb;margin:22px 0;">

              <p style="margin:0;font-size:13px;color:#777;">
                Thank you for your purchase! If you have any questions, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#faf6ff;padding:16px 24px;text-align:center;color:#6b2ca7;font-size:13px;">
              <div style="margin-bottom:6px;font-weight:600;">Ariatoon</div>
              <div style="opacity:0.85;">© %d Ariatoon. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, coins, amountUSD, orderID, time.Now().Year())

	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + email + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			body + "\r\n",
	)

	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, to, msg); err != nil {
		return err
	}

	fmt.Println("PayPal payment confirmation email sent successfully to:", email)
	return nil
}

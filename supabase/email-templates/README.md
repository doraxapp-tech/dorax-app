# Account emails

The five emails Supabase sends for an account, in Portuguese, Spanish or English. Since v229 each looks like a page of the website without its menu: the top with the logo, a drawing, the heading and the button; what to do if the button does not work or it was not you; a band in the home page's words; the website's footer. The reminders function draws its emails from the same parts (`supabase/functions/reminders/email.mjs`).

Three ask the person to do something (one button):

| File | Supabase template | Sent when |
| --- | --- | --- |
| `confirm-signup.html` | Confirm sign up | Someone creates an account with email and password |
| `reset-password.html` | Reset password | Someone asks for a new password |
| `change-email.html` | Change email address | Someone changes the email of their account |

Two only tell the person something was changed, and what to do if it was somebody else. They are off until you switch them on:

| File | Supabase template (under **Security**) | Sent when |
| --- | --- | --- |
| `password-changed.html` | Password changed | The password of an account was changed |
| `email-changed.html` | Email address changed | The email of an account was changed |

## Putting them into Supabase

Supabase > **Authentication > Emails > Templates**. For each of the five:

1. Open the template (names in the tables above; the two notices are in the **Security** list, opened with the arrow at the end of their row).
2. **Subject**: paste that email's `subject:` line from `subjects.txt`, all of it, curly braces included.
3. **Body**: switch the editor to **Source**, delete what is there, paste the whole content of the `.html` file.
4. **Save**.

Then, in the **Security** list, switch on **Password changed** and **Email address changed** and press **Save changes**. Leave the others off: the app has no phone numbers, no way to remove a login method and no two-step login. Paste first, switch on after, or people get Supabase's plain English text.

## Changing an email needs nobody to step in

When someone changes the email of their account, Supabase sends `change-email.html` to **both** addresses, the current one and the new one, and the email only changes after the button was pressed in both. So an account cannot be moved to another address by someone who cannot read the owner's inbox, and a person who gets the email without having asked simply does not press the button. Neither email tells people to write to you.

This depends on one switch, which is on unless someone turned it off: Supabase > **Authentication > Sign In / Providers > Email > Secure email change**. Check that it is on. If it were off, only the new address would get the link and the texts of these two emails would be wrong.

What it cannot cover: someone who is inside a person's account and can also read that person's inbox. No website can sort that out by itself.

## What has to be true for them to look right

- **The pictures are files the site serves**: `https://dorax.app/assets/email/…` (the folder `app/assets/email/`: the logos, and the drawings in `art/`). They show once the site has been deployed with them, so push the site before pasting these files. In mail programs that block pictures, the words "Dorax Finance" show in place of the logo and the drawings leave their room empty. `dorax-logo.png` is the old logo, still used by the old templates until these are pasted; it can go after.
- **Sender name**: in Supabase > Authentication > Emails > SMTP Settings, "Sender name" must say `Dorax Finance`. If it is empty the inbox shows the address instead of the name.
- **The language** is the one the person had chosen when they created the account (the app sends it to Supabase as `lang`). Changing the language later inside the app does not change it for emails yet. No language, or another one, gets Portuguese.

## Changing the texts

Edit `tools/build-emails.js` (each text is there once, in the three languages), run `npm run emails`, then paste the changed files into Supabase again. Do not edit the `.html` files by hand: the next run overwrites them.

Keep `{{ .ConfirmationURL }}` in the three emails that have it: it is the link. The two notices have none on purpose; their button opens the site (`{{ .SiteURL }}`, the Site URL set under Authentication > URL Configuration). Keep them to one button and no offers: the footer's links are the website's own pages (Help, Blog, Contact, Privacy). Account emails that look like advertising are the ones that land in spam.

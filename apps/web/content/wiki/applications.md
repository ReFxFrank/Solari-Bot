# Applications

Run staff applications, ban appeals, or any custom form — collect answers in Discord and review them with one click.

## How it works

Create one or more **forms** in the dashboard, each with up to five questions. Members open a form with `/apply` (or a button on an application panel) and fill it in as a Discord pop-up. Their answers post to your review channel with **Approve** and **Deny** buttons, and also appear in the dashboard's review queue.

When a submission is approved, Solari can grant a role and DMs the applicant the result (with an optional message from the reviewer). Deny works the same way, minus the role.

## Commands

| Command | What it does |
| --- | --- |
| `/apply [form]` | Open a form and submit an application |
| `/applications panel [channel]` | Post a panel with a button for each enabled form |

## Reviewing

Anyone with **Manage Server** can review, plus any **reviewer roles** you add in the dashboard. Reviewers can decide from the review-channel buttons or from the dashboard's pending queue — either way the applicant is notified and the review message updates in place.

## Settings

Dashboard → **Applications**:

- **Reviewers** — roles allowed to approve/deny (in addition to Manage Server).
- **Forms** — create, edit, enable/disable, and delete forms. Each form has a name, optional description, up to five questions (short or paragraph, required or optional), a review channel, and an optional role to grant on approval.
- **Application panel** — post a button panel to a channel so members can apply without a command.

> Discord limits a form to **five questions** (one modal). Split longer intake into multiple forms if you need more.

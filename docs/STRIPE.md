# Stripe billing setup

Solari Premium is a **per-server** upgrade sold through Stripe. Billing stays
fully disabled until the `STRIPE_*` variables are set — the dashboard shows
"billing not configured" and the pricing page marks plans "Coming soon".

## Environment variables

| Variable | What it is | Looks like |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Live secret API key | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for your webhook endpoint | `whsec_…` |
| `STRIPE_PREMIUM_PRICE_ID` | Monthly **recurring** price | `price_…` |
| `STRIPE_YEARLY_PRICE_ID` | Yearly **recurring** price (optional) | `price_…` |
| `STRIPE_LIFETIME_PRICE_ID` | **One-time** price (optional) | `price_…` |

Only `STRIPE_SECRET_KEY` + `STRIPE_PREMIUM_PRICE_ID` are required to turn billing
on. A plan card appears only when its price id is set.

The public endpoint is `https://<your-domain>/api/stripe/webhook`.

## 1. Secret key

Stripe Dashboard → toggle **Test mode** off (top-right) for live → **Developers →
API keys** → copy the **Secret key** (`sk_live_…`).

## 2. Prices

**Product catalog → Add product** ("Solari Premium"). Add three prices to that
one product and copy each **Price id** (⋯ → *Copy price ID* — it starts with
`price_`, **not** the `prod_…` shown at the top of the product page):

| Plan | Type | Amount | Env var |
| --- | --- | --- | --- |
| Monthly | Recurring · Monthly | $9.99 | `STRIPE_PREMIUM_PRICE_ID` |
| Yearly | Recurring · Yearly | $95.88 | `STRIPE_YEARLY_PRICE_ID` |
| Lifetime | One-time | $249 | `STRIPE_LIFETIME_PRICE_ID` |

The displayed prices live in `apps/web/lib/pricing.ts` — keep them in sync with
the Stripe amounts.

## 3. Webhook endpoint

**Developers → Webhooks → Add endpoint** → URL
`https://<your-domain>/api/stripe/webhook`. Enable these events:

- `checkout.session.completed` — activates a purchase (subscriptions **and**
  one-time Lifetime).
- `customer.subscription.created` / `updated` / `deleted` — keep subscriptions
  in sync (renewals, cancellations, past-due → auto-downgrade to Free).
- `charge.refunded` — a refunded **Lifetime** purchase loses Premium.
- `charge.dispute.created` — a chargeback on any plan revokes Premium.

Copy the endpoint's **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

## 4. Customer portal

Monthly/Yearly buyers get a **Manage billing** button that opens Stripe's portal.
Activate it once: **Settings → Billing → Customer portal → Activate**.

## 5. Apply + verify

Put the values in `.env`, confirm `AUTH_URL=https://<your-domain>`, then
redeploy (`./scripts/redeploy.sh`). Verify with:

- Dashboard → a server → **Premium** shows a card per configured plan.
- A checkout completes → Stripe **Webhooks → your endpoint** logs a `200` on
  `checkout.session.completed` → the page flips to **Premium active**.
- DB check (source of truth the bot reads):
  ```sql
  SELECT "premiumTier" FROM "Guild" WHERE id = '<guildId>';
  SELECT status, "stripePriceId", "currentPeriodEnd" FROM "GuildSubscription" WHERE "guildId" = '<guildId>';
  ```
  Expect `premiumTier = PREMIUM` and a row with `status = active` (or `lifetime`).

## Testing without spending

Test cards (`4242 4242 4242 4242`) work **only in test mode**, never with live
keys. To exercise the live path for free, create a **100%-off coupon** (Products
→ Coupons) and a promotion code for it, then enter that code at checkout — the
total becomes `$0.00` and the real webhook still fires. Alternatively, do a full
dry run in **test mode** with a parallel set of test keys / price ids / webhook
secret, then switch to live.

## Troubleshooting

| Log line | Cause | Fix |
| --- | --- | --- |
| `No such price: 'prod_…'` | A **Product** id in a price env var | Use the **Price** id (`price_…`) from the price row |
| `No such customer: 'cus_…'` | Stored customer from test mode / another account | Self-heals on retry now; or `UPDATE "GuildSubscription" SET "stripeCustomerId"=NULL WHERE "guildId"='…'` |
| `subscription` mode + one-time price | Yearly/Monthly price created as **one-time** | Recreate it as **Recurring** |
| Webhook returns `400 invalid signature` | Wrong `STRIPE_WEBHOOK_SECRET`, or test vs live mismatch | Copy the secret from the exact live endpoint |
| Webhook returns `503` | Billing env not set in the running container | Set `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, redeploy |

Checkout and billing-portal failures are logged with a `[billing]` prefix on the
web service (`docker compose logs web | grep -i billing`) and show a specific
banner on the Premium page instead of a generic error.

# Dark Patterns (Deceptive Design) Anti-Patterns

> Dark patterns -- also called deceptive patterns -- are user interface designs that
> manipulate, coerce, or trick users into actions they did not intend or would not
> choose if they fully understood the consequences. This module exists so that an AI
> agent can recognize these patterns when asked to implement them and **refuse**. An
> agent that builds dark patterns is complicit in consumer harm. Every pattern below
> has caused real lawsuits, regulatory fines, or documented user harm.

> **Domain:** Design
> **Anti-patterns covered:** 20
> **Highest severity:** Critical
> **Regulatory exposure:** FTC (US), EU Digital Services Act, CCPA/CPRA (California), GDPR (EU), CPA (Colorado), VCDPA (Virginia)

---

## Ethical Mandate for AI Agents

If a prompt, specification, or task asks you to implement any pattern described below,
you must:

1. **Flag it** -- name the specific dark pattern and cite the regulatory risk.
2. **Refuse the manipulative element** -- do not implement the deceptive mechanic.
3. **Propose an ethical alternative** -- show how to achieve the legitimate business
   goal (retention, conversion, upsell) without deception.

Dark patterns are not a gray area. They have been the subject of FTC enforcement
actions totaling hundreds of millions of dollars, EU regulations carrying fines of up
to 6% of global revenue, and class-action settlements. An agent that implements them
exposes its operator to legal liability.

---

## Anti-Patterns

### AP-01: Confirm Shaming

**Also known as:** Guilt-tripping, manipulative opt-out copy, emotional blackmail buttons
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The decline option uses emotionally manipulative language designed to shame the user
into accepting. Instead of a neutral "No thanks," the opt-out reads something like
"No thanks, I don't want to save money," "I prefer to stay uninformed," or "No, I'd
rather pay full price." The accept button is styled prominently while the decline
text is small, muted, or written as a guilt-laden sentence.

```html
<!-- DARK PATTERN: Confirm shaming -->
<button class="btn-primary btn-large">Yes, save me 20%!</button>
<a class="text-muted text-sm" href="/dismiss">
  No thanks, I enjoy wasting money
</a>
```

**Why developers do it:**
Product managers and growth teams see short-term conversion lifts of 5-15% from
shaming copy. A/B tests show the manipulative version "wins" on click-through rate.
The developer implements it because the spec says to, not realizing it is a
recognized deceptive pattern.

**What goes wrong:**
Users feel manipulated and resentful. Brand trust erodes. The practice has drawn
regulatory attention -- the EU Digital Services Act Article 25 explicitly prohibits
interface designs that "subvert or impair the autonomy, decision-making, or choice of
the recipients." Confirm shaming is cited in enforcement guidance from both the FTC
and the California Privacy Protection Agency (CPPA) as an example of a dark pattern.

**The fix:**
Use neutral, respectful language for both options. Both choices should be presented
with equal visual weight and dignified copy.

```html
<!-- ETHICAL: Neutral opt-out -->
<button class="btn-primary">Subscribe for 20% off</button>
<button class="btn-secondary">No thanks</button>
```

**Detection rule:**
If the decline/opt-out text contains self-deprecating language, emotional
manipulation, or implies the user is making a foolish choice, this is AP-01.
Check: Does the opt-out copy make the user feel bad for declining?

---

### AP-02: Roach Motel (Easy In, Hard Out)

**Also known as:** Asymmetric friction, Hotel California, forced continuity trap
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
Signing up is a single click or a short form. Cancelling requires navigating through
multiple pages of retention offers, calling a phone number during limited hours,
sending a letter by mail, or clicking through a maze of "Are you sure?" screens.
Amazon internally called their Prime cancellation flow "Iliad" -- a reference to the
epic Greek poem -- because of how long and arduous it was.

```
SIGN UP:    [Email] [Password] [Subscribe] → Done (1 page)
CANCEL:     Settings → Account → Subscription → Manage → Cancel →
            "Before you go..." → Retention offer #1 → Decline →
            "Are you SURE?" → Retention offer #2 → Decline →
            "Last chance!" → Confirm → Enter password → Done (7+ pages)
```

**Why developers do it:**
Retention metrics directly affect revenue. Every friction point in the cancellation
flow reduces churn by measurable percentages. Product teams optimize for "saves"
(users who abandon cancellation mid-flow) as a KPI.

**What goes wrong:**
The FTC sued Amazon in 2023 over its Prime cancellation flow, alleging it used "dark
patterns to trick consumers into enrolling in automatically-renewing Prime
subscriptions." The case proceeded after a federal judge allowed it to advance in May
2024. Vonage paid $100 million in FTC settlements (2022) for making cancellation
deliberately difficult -- forcing customers to call a "retention agent" on a phone
line with limited hours and long wait times. Adobe was sued by the DOJ on behalf of
the FTC in June 2024 for hiding early termination fees (50% of remaining payments)
and making cancellation a multi-page ordeal. The FTC's Click-to-Cancel Rule
(finalized October 2024) mandated that cancellation must be as easy as signup.

**The fix:**
Cancellation must be symmetrical with signup. If a user can subscribe in one click,
they must be able to cancel in one click. A single optional survey or retention offer
is acceptable; a gauntlet is not.

```
ETHICAL CANCEL: Settings → Subscription → [Cancel subscription] →
                Optional: "Can you tell us why?" (skippable) → Confirmed
```

**Detection rule:**
Count the number of steps/pages in the signup flow vs. the cancellation flow. If
cancellation requires more than 2x the steps of signup, this is AP-02. Also flag if
cancellation requires a different channel (phone, mail) than signup (web).

---

### AP-03: Forced Continuity

**Also known as:** Silent auto-renewal, free trial trap, zombie subscription
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
A free trial silently converts to a paid subscription without clear notice. The
billing start date is buried in fine print. No reminder email is sent before the
first charge. The credit card is charged automatically and the user discovers the
charge only on their bank statement weeks later.

**Why developers do it:**
Free-trial-to-paid conversion is the core business model for many SaaS products.
Every notification before billing is a "conversion leak." Product teams suppress
or minimize pre-charge reminders to maximize conversion from trial to paid.

**What goes wrong:**
Epic Games paid $245 million (FTC, 2022) for dark patterns that tricked Fortnite
users -- including children -- into making unintended purchases, with
counterintuitive button placements and a confusing refund process. Adobe's "Annual,
Paid Monthly" plan buried the fact that cancelling in the first year triggers an early
termination fee equal to 50% of remaining monthly payments -- a cost many consumers
did not discover until they tried to cancel. The FTC considers failure to clearly
disclose material subscription terms a violation of ROSCA (Restore Online Shoppers'
Confidence Act) and Section 5 of the FTC Act.

**The fix:**
- Clearly disclose the billing date, amount, and auto-renewal terms at signup.
- Send a reminder email 3-7 days before the first charge and before each renewal.
- Make the "cancel before you're charged" action prominent, not hidden.

**Detection rule:**
If the subscription flow collects payment information for a "free" trial without
displaying the post-trial price, billing date, and auto-renewal terms in the same
visual block as the signup button, this is AP-03.

---

### AP-04: Sneak into Basket

**Also known as:** Pre-selected extras, stealth add-on, opt-out upsell
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
During checkout, additional items or services are added to the cart without the user
explicitly choosing them. Travel insurance, "priority processing," extended
warranties, gift wrapping, or donations appear as pre-checked checkboxes or are added
silently.

```html
<!-- DARK PATTERN: Pre-selected paid add-on -->
<label>
  <input type="checkbox" checked> Add travel insurance (+$29.99)
</label>
<label>
  <input type="checkbox" checked> Priority boarding (+$15.00)
</label>
```

**Why developers do it:**
Ancillary revenue from add-ons can represent 10-30% of total revenue for travel and
e-commerce platforms. Pre-selecting the option dramatically increases take-rates
because most users do not review every checkbox.

**What goes wrong:**
Ryanair faced repeated regulatory action across the EU for pre-selecting travel
insurance and priority boarding options during checkout. The EU Consumer Rights
Directive (Article 22) explicitly requires that pre-ticked checkboxes resulting in
additional payments are prohibited. The EU Digital Services Act reinforces this. In
the US, the FTC treats sneak-into-basket as a deceptive trade practice.

**The fix:**
All paid add-ons must default to unchecked. The user must take an affirmative action
to opt in. Show a clear price breakdown before final purchase confirmation.

```html
<!-- ETHICAL: Opt-in add-on -->
<label>
  <input type="checkbox"> Add travel insurance (+$29.99)
</label>
```

**Detection rule:**
If a checkout flow contains a `<input type="checkbox" checked>` or equivalent
default-on toggle for any item that costs money, this is AP-04.

---

### AP-05: Hidden Costs

**Also known as:** Drip pricing, fee creep, sticker-shock checkout
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The advertised price is low, but service fees, processing fees, facility charges,
"convenience" fees, taxes, and surcharges appear only at the final checkout step --
after the user has invested time selecting options and entering information.

```
Advertised:   Concert ticket — $50.00
At checkout:  Ticket:         $50.00
              Service fee:    $12.50
              Facility fee:    $5.00
              Processing fee:  $8.95
              Order fee:       $4.55
              ────────────────────────
              Total:          $81.00
```

**Why developers do it:**
Lower displayed prices attract more initial clicks. By the time hidden fees appear,
the user has invested "sunk cost" (time selecting seats, entering info) and is less
likely to abandon. This is a textbook exploitation of the sunk cost fallacy.

**What goes wrong:**
Ticketmaster and Live Nation have faced continuous regulatory scrutiny and class-action
lawsuits over drip pricing. The FTC proposed a rule in 2023 specifically targeting
"junk fees" and hidden costs. Multiple US states have passed drip-pricing laws. The
practice destroys trust: a 2019 Princeton/University of Chicago study found hidden
costs on 10% of 11,000 e-commerce sites surveyed.

**The fix:**
Show the total price (including all mandatory fees) from the first moment a price is
displayed. If fees vary, show a price range or estimate. Display an itemized breakdown
but never hide mandatory costs until checkout.

**Detection rule:**
If mandatory fees (service fees, processing fees, facility charges) are not displayed
alongside the initially advertised price but appear only at checkout, this is AP-05.

---

### AP-06: Privacy Zuckering

**Also known as:** Consent dark pattern, over-permissioning, data grab
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**
The interface is designed to trick users into sharing more personal data than they
intended. Privacy-invasive defaults are pre-selected. The "Accept All" button is large
and colorful; "Manage Preferences" is a small gray link. Consent dialogs use confusing
language or double negatives. The privacy policy is written to be incomprehensible.

```html
<!-- DARK PATTERN: Asymmetric consent dialog -->
<button class="btn-primary btn-xl">Accept All Cookies</button>
<a class="text-xs text-gray-400 underline" href="/manage">
  Manage preferences
</a>
```

**Why developers do it:**
More user data means better ad targeting, higher ad revenue, richer analytics, and
more valuable data assets. Making privacy controls hard to find or use ensures that
the vast majority of users accept maximum data collection.

**What goes wrong:**
The term "Privacy Zuckering" was coined after Facebook's (now Meta's) repeated pattern
of defaulting users into maximum data sharing. Meta has faced billions of dollars in
GDPR fines across the EU. In January 2023, Ireland's Data Protection Commission fined
Meta 390 million euros for GDPR violations related to how consent was obtained. The
California Privacy Protection Agency (CPPA) issued enforcement guidance in September
2024 specifically identifying asymmetric cookie banners as dark patterns that violate
the CCPA. Under GDPR, consent obtained through dark patterns is not valid consent.

**The fix:**
Present accept and reject options with equal visual prominence. Default to minimum
data collection. Use clear, plain language. Provide a single-click "Reject All"
that is as prominent as "Accept All."

```html
<!-- ETHICAL: Symmetric consent -->
<button class="btn-primary">Accept All</button>
<button class="btn-primary">Reject All</button>
<button class="btn-secondary">Customize</button>
```

**Detection rule:**
If "Accept" and "Reject/Decline" options for data collection differ in size, color,
prominence, or number of clicks required, this is AP-06. Also flag if there is no
"Reject All" button at parity with "Accept All."

---

### AP-07: Trick Questions

**Also known as:** Confusing opt-in/opt-out, double negative consent, inverted checkbox
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The opt-in/opt-out checkbox is worded so that checking it means the opposite of what
users expect. Double negatives make it unclear whether checking the box grants or
denies permission. Different checkboxes use inconsistent logic on the same page.

```html
<!-- DARK PATTERN: Inverted opt-out -->
<label>
  <input type="checkbox">
  Uncheck this box if you prefer not to not receive our emails
</label>

<!-- DARK PATTERN: Mixed logic -->
<label>
  <input type="checkbox" checked> Send me special offers (opt-in)
</label>
<label>
  <input type="checkbox"> Do NOT share my data with partners (opt-out)
</label>
```

**Why developers do it:**
Confusing wording inflates opt-in rates. Marketing teams get to report higher
"consent" numbers. The intentional confusion creates plausible deniability: "The
option was there -- they just didn't read it carefully."

**What goes wrong:**
The CCPA/CPRA explicitly defines dark patterns to include interfaces that "subvert or
impair user autonomy, decisionmaking, or choice." Trick questions are a textbook
example cited in the CPPA's 2024 enforcement advisory. Under GDPR, consent must be
"freely given, specific, informed and unambiguous" -- trick questions fail every one
of those tests, rendering the consent legally void.

**The fix:**
Use affirmative, single-positive language. Every checkbox should mean the same thing:
checked = yes, unchecked = no. Never use double negatives. All checkboxes on the same
form should follow the same logic direction.

**Detection rule:**
If a checkbox label contains a negation ("not," "don't," "un-") or a double negative,
this is AP-07. Also flag if checkboxes on the same form use inconsistent logic
(some opt-in, some opt-out).

---

### AP-08: Misdirection

**Also known as:** Visual manipulation, attention diversion, decoy prominence
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The interface uses visual hierarchy, color, size, and placement to draw attention to
the option the business wants the user to choose, while making the user-beneficial
option visually recessive. The "Upgrade" button is large and green; the "Keep current
plan" link is small gray text. The dialog is designed so that the eye naturally falls
on the desired action.

```html
<!-- DARK PATTERN: Visual misdirection -->
<div class="upgrade-dialog">
  <h2>Upgrade to Premium!</h2>
  <button class="btn-green btn-xl shadow-lg animate-pulse">
    Upgrade Now - $9.99/mo
  </button>
  <p class="text-xs text-gray-300 mt-4">
    <a href="/dismiss">keep free plan</a>
  </p>
</div>
```

**Why developers do it:**
Growth teams optimize for conversion. Making the revenue-generating option visually
dominant is an easy win. The technique is subtle enough that it often passes design
review without being flagged as manipulative.

**What goes wrong:**
When misdirection crosses from "good UX hierarchy" into manipulation, it violates
the DSA Article 25 prohibition on designs that "distort or impair the ability of
recipients to make autonomous and informed choices." The line is crossed when the
less profitable option is deliberately hidden or made to look like it is not a real
option. Microsoft faced backlash and regulatory complaints when its Windows 10
upgrade prompt was redesigned so that clicking the X button (which users understood
as "dismiss/close") instead initiated the upgrade.

**The fix:**
Both options must be clearly visible and accessible. The user-beneficial option
(keep current plan, dismiss, decline) must be a real button, not a tiny link. Visual
hierarchy can highlight a recommended option, but the alternative must be equally
discoverable.

**Detection rule:**
If the business-beneficial option is a large styled button and the user-beneficial
option is unstyled inline text, a tiny link, or positioned where it appears to be
decorative text rather than an actionable choice, this is AP-08.

---

### AP-09: Urgency and Scarcity Manipulation

**Also known as:** Fake timers, phantom stock, FOMO manufacturing, artificial scarcity
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
Countdown timers that reset when they expire. "Only 2 left in stock!" messages that
never change. "5 other people are looking at this right now" notifications that are
fabricated or inflated. "Deal ends in 00:14:32" clocks that are not tied to any real
deadline.

```javascript
// DARK PATTERN: Fake urgency timer that resets
function startTimer() {
  let seconds = 900; // 15 minutes
  setInterval(() => {
    seconds--;
    if (seconds <= 0) seconds = 900; // Reset silently
    display(seconds);
  }, 1000);
}
```

**Why developers do it:**
Urgency and scarcity are powerful psychological triggers. They exploit loss aversion
-- the fear of missing out (FOMO) is stronger than the desire to gain. Even a 5%
conversion lift from a fake timer looks compelling in an A/B test dashboard.

**What goes wrong:**
Booking.com has faced sustained regulatory pressure from the Dutch consumer
organization Consumentenbond for fake scarcity messaging ("Only 1 room left!"),
fabricated social proof ("5 others are looking"), and fake discounts. The EU Digital
Services Act explicitly targets "practices that create a false impression of urgency"
in its dark pattern prohibition. Under the proposed EU Digital Fairness Act (expected
mid-2026), platforms must prove that urgency messages reflect actual availability or
face fines. Research shows that while fake urgency temporarily boosts conversions,
it causes lasting trust damage when users discover the deception.

**The fix:**
Only display urgency or scarcity information that is factually accurate and
dynamically tied to real data. If stock is genuinely low, show it. If there is a real
deadline, show it. Never fabricate or inflate these signals.

```javascript
// ETHICAL: Real stock count from inventory API
async function showStock(productId) {
  const { count } = await inventory.getStock(productId);
  if (count <= 5 && count > 0) {
    display(`Only ${count} left in stock`);
  }
}
```

**Detection rule:**
If a countdown timer resets, loops, or is initialized from a hardcoded value rather
than a real deadline from a backend API, this is AP-09. If stock/availability messages
use hardcoded values or random numbers, this is AP-09.

---

### AP-10: Obstruction

**Also known as:** Cancellation maze, support runaround, process friction
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**
A process that should be simple is deliberately complicated with unnecessary steps,
required phone calls, long hold times, confusing navigation, or requirements to
contact support via specific channels during limited hours. This is the generalized
form of the Roach Motel (AP-02) applied beyond subscriptions: deleting an account,
requesting a data export, submitting a refund, opting out of data sharing.

**Why developers do it:**
Each friction point reduces the completion rate of the undesirable action (from the
business perspective). A cancellation flow with 7 steps has a lower completion rate
than one with 2 steps, purely from drop-off at each step.

**What goes wrong:**
Vonage's $100 million FTC settlement (2022) was specifically about obstruction: the
company forced customers to cancel only by calling a "retention agent" on the phone,
then reduced the cancellation line's hours and staffing, creating long waits and
dropped calls. The FTC found that Vonage continued charging customers even after they
explicitly requested cancellation. Under the CCPA, businesses must respond to
consumer data deletion requests without requiring excessive steps; the CPPA's 2024
enforcement advisory specifically flags multi-step data request flows as dark
patterns.

**The fix:**
Any user-initiated process (cancel, delete, refund, opt-out, data export) should
require no more steps than the corresponding sign-up or opt-in process. Provide the
same channel (web self-service) for exit as for entry. Never require a phone call for
something that was done online.

**Detection rule:**
If any user-initiated exit process (cancel, delete account, request refund, opt out)
requires a phone call, postal mail, or more than 3 clicks/screens beyond
authentication, this is AP-10.

---

### AP-11: Disguised Ads

**Also known as:** Native ad camouflage, fake download buttons, content-ad blending
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
Advertisements are designed to look like native content, navigation elements, or
functional UI components. Fake "Download" buttons on software sites that are actually
ads. Sponsored content without clear disclosure. Search results where the top entries
are paid placements indistinguishable from organic results.

**Why developers do it:**
Ads that blend with content get higher click-through rates. Native ad revenue can be
2-5x higher than clearly labeled ads. The more the ad looks like real content, the
more clicks it receives.

**What goes wrong:**
The FTC's Endorsement Guides (updated 2023) require clear and conspicuous disclosure
of material connections and paid promotions. Google was fined 2.42 billion euros by
the European Commission (2017) for favoring its own shopping ads over organic results.
The FTC has taken action against advertisers and publishers who blur the line between
editorial content and paid promotions. Children are especially vulnerable to disguised
ads, which is why COPPA and the Children's Code impose stricter requirements.

**The fix:**
All advertisements must be clearly labeled with terms like "Ad," "Sponsored," or
"Promoted." Ad styling must be visually distinct from editorial content. Download
buttons must only link to the actual download, not to ad redirects.

**Detection rule:**
If an interactive element (button, link, card) is styled to look like native content
or a functional UI component but actually navigates to a third-party ad, sponsor, or
affiliate link without visible disclosure adjacent to the element, this is AP-11.

---

### AP-12: Friend Spam

**Also known as:** Contact harvesting, social spam, permission abuse
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The application requests access to the user's contacts "to find friends on the
platform," then sends unsolicited messages to every contact -- styled to appear as
personal messages from the user rather than platform-generated spam.

**Why developers do it:**
Viral growth through contact importation is extremely effective. Messages that appear
to come from a friend have dramatically higher open and click rates than generic
marketing. The growth loop of "import contacts, spam them, some sign up, repeat" is
a core growth hack.

**What goes wrong:**
LinkedIn settled a class-action lawsuit for $13 million over its "Add Connections"
feature, which spammed users' contacts with messages designed to look like personal
emails from the user. The court found LinkedIn had exceeded the scope of the
permission granted. Path, the social network, was fined $800,000 by the FTC in 2013
for collecting entire address books from users -- including children -- without
consent. Under CAN-SPAM and GDPR, sending unsolicited commercial messages to contacts
without their consent violates anti-spam laws.

**The fix:**
If you request contact access, clearly explain exactly what will happen with the data.
Never send messages to contacts without the user explicitly reviewing and approving
each message. Default to not sending. Show a preview of the exact message that will
be sent.

**Detection rule:**
If a "Find Friends" or "Import Contacts" flow sends messages to imported contacts
without showing the user an explicit preview of the message and requiring per-message
or per-batch approval, this is AP-12.

---

### AP-13: Bait and Switch

**Also known as:** Promise-and-swap, feature hostage, upgrade trap
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The user sets out to do one thing, but the interface redirects them to something
different. A "free" photo editor lets you spend 20 minutes editing, then demands
payment to save. A button labeled "Close" actually triggers an action (like installing
software). An advertised product is "out of stock" but a more expensive alternative
is conveniently suggested.

**Why developers do it:**
The sunk cost fallacy makes users more likely to pay after investing time. The
technique generates conversions that would not exist if the true cost or action were
disclosed upfront. Microsoft famously used this with Windows 10 upgrades: the X
(close) button on the upgrade nag dialog was changed to mean "accept and schedule
upgrade" rather than "dismiss," triggering widespread installations users did not
consent to.

**What goes wrong:**
Microsoft faced a $10,000 legal judgment in 2016 when a user successfully sued after
an unwanted Windows 10 upgrade disrupted her business. The backlash generated
sustained negative press coverage and regulatory complaints. The FTC considers bait
and switch a deceptive trade practice under Section 5 of the FTC Act, with case law
dating back decades.

**The fix:**
Every interactive element must do exactly what its label says. A close button closes.
A dismiss button dismisses. If a feature requires payment, state the cost before the
user invests time using it, not after.

**Detection rule:**
If a button, link, or interactive element performs an action different from what its
label communicates, or if a "free" feature requires payment to complete the workflow
the user has already started, this is AP-13.

---

### AP-14: Nagging

**Also known as:** Persistent prompts, dismissal denial, upgrade harassment
**Frequency:** Very Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The same prompt, dialog, or notification appears repeatedly despite the user
dismissing it. There is no "Don't ask again" option, or the option exists but does
not work. The interruption degrades the user experience until the user capitulates.

**Why developers do it:**
Repeated exposure increases conversion. Even a 1% conversion rate on a nagging dialog
shown 50 times eventually yields results. Product teams measure the aggregate
conversion from nagging and see it as "free" revenue.

**What goes wrong:**
Microsoft's Windows 10 upgrade nagging campaign (2015-2016) became one of the most
widely cited examples of nagging as a dark pattern. The system blocked users with
full-screen upgrade prompts that had no permanent dismissal option, only "Remind me
later." Windows 10 continued this pattern with "Finish setting up your PC" prompts
that nagged users to create Microsoft accounts. Mozilla publicly condemned Microsoft
in 2024 for using dark patterns to push Windows users toward Edge browser, including
persistent prompts when users attempted to change their default browser.

**The fix:**
Every dismissable prompt must include a "Don't show again" option that permanently
suppresses it. Respect the user's choice. Limit notification frequency. Never block
core functionality behind a dismissal-only dialog.

**Detection rule:**
If a dismissable dialog or prompt reappears after the user has dismissed it, and there
is no permanent "Don't show again" mechanism, this is AP-14. Also flag if a "Don't
show again" checkbox or option exists but the prompt reappears anyway.

---

### AP-15: Comparison Prevention

**Also known as:** Price obfuscation, feature-matrix confusion, plan incomparability
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Hard

**What it looks like:**
Pricing plans are structured so that direct comparison is difficult or impossible.
Different plans use different billing periods (monthly vs. annual vs. per-seat vs.
per-usage). Feature names differ across tiers. The pricing page requires selecting
dates, team sizes, or other parameters before any price is visible. Feature matrices
are deliberately designed to be confusing.

**Why developers do it:**
When users cannot easily compare, they are more likely to choose the option the
business wants (usually the most expensive one). Obfuscation prevents the "race to
the bottom" on price and makes it harder for competitors to undercut.

**What goes wrong:**
Price comparison prevention is one of Harry Brignull's original dark patterns
documented on deceptive.design. The EU Digital Fairness Act proposal (expected
mid-2026) will specifically target practices that make comparison difficult. Users
who discover they overpaid due to deliberate obfuscation file chargebacks, leave
negative reviews, and churn -- the lifetime value loss exceeds the short-term margin
gain.

**The fix:**
Display all plans in a single, aligned comparison table with consistent feature names,
the same billing period, and visible per-unit prices. Make the total cost clear before
the user has to provide any personal information. Enable rather than prevent informed
comparison.

**Detection rule:**
If a pricing page requires user input (dates, team size, contact sales) before showing
any price, or if plan tiers use different billing units that cannot be directly
compared, this is AP-15.

---

### AP-16: Default to Most Expensive

**Also known as:** Preselected premium, auto-upsell, inflated default
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Easy

**What it looks like:**
The most expensive option is pre-selected in a plan chooser, shipping method selector,
or configuration wizard. The user must actively downgrade to find the cheaper option.
The default tier is labeled "Recommended" or "Most Popular" regardless of whether it
matches the user's needs.

```html
<!-- DARK PATTERN: Pre-selected expensive option -->
<div class="plan selected highlighted">Premium — $49/mo (Recommended!)</div>
<div class="plan">Standard — $19/mo</div>
<div class="plan text-muted">Basic — $9/mo</div>
```

**Why developers do it:**
Defaults are powerful -- research shows 70-90% of users accept defaults. Pre-selecting
the premium tier dramatically increases average revenue per user. The "Recommended"
label provides cover for the pre-selection.

**What goes wrong:**
GoDaddy pre-selects paid "Privacy Protection" add-ons when users purchase domain
names, leading to higher-than-expected charges. While not yet the subject of major
enforcement, this practice falls clearly within the scope of EU and US dark pattern
regulations. The FTC's unfairness doctrine applies when material terms are selected
without the consumer's informed consent.

**The fix:**
Either default to the cheapest option or default to no selection, requiring the user
to make an active choice. If labeling an option "Recommended," ensure the
recommendation is based on the user's actual stated needs, not on margin.

**Detection rule:**
If a plan selector, shipping method, or configuration option defaults to the most
expensive choice without the user having provided any information about their needs,
this is AP-16.

---

### AP-17: Emotional Manipulation in Copy

**Also known as:** Guilt copy, fear copy, loss-framing, weaponized empathy
**Frequency:** Common
**Severity:** Medium
**Detection difficulty:** Moderate

**What it looks like:**
Interface copy uses emotional pressure beyond simple persuasion: fear of loss ("Your
account is at risk!"), guilt ("Your team is counting on you"), faked sadness ("We'll
miss you" with a crying mascot on the cancellation page), or manufactured obligation.
This is the broader pattern of which confirm shaming (AP-01) is a specific subtype.

**Why developers do it:**
Emotional copy outperforms neutral copy on short-term metrics. A "We'll miss you"
cancellation page with a sad mascot may reduce cancellation completion by 10-15%.
Copywriters are incentivized to maximize emotional impact.

**What goes wrong:**
Emotional manipulation in cancellation flows has been cited in multiple FTC complaints.
When combined with obstruction (AP-10), it becomes a compounding dark pattern that
regulators treat with heightened scrutiny. Users who feel manipulated share their
experience on social media, generating negative brand sentiment that persists far
longer than the retained subscription revenue.

**The fix:**
Use clear, neutral, professional language. It is acceptable to communicate value
("Here's what you'll lose access to") but not to use guilt, shame, fear, or fake
emotion to influence the decision. Remove sad mascots, crying emojis, and guilt
language from exit flows.

**Detection rule:**
If cancellation, unsubscribe, or opt-out flows contain emotional language (sad,
crying, disappointed, worried, at risk, miss you, counting on you), animated sad
characters, or guilt-inducing imagery, this is AP-17.

---

### AP-18: Pre-Selected Options That Cost Money

**Also known as:** Opt-out add-ons, default paid extras, consent by inertia
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**
Checkboxes for paid services, donations, or upgrades are checked by default during
signup or checkout. The user must notice and uncheck them to avoid charges. Often the
checkboxes are placed far from the main flow, below the fold, or in a visually
de-emphasized area.

A notorious example: Ryanair once hid the "No travel insurance" option in a dropdown
menu between "Latvia" and "Lithuania" in a country selection list, making it nearly
impossible to find the opt-out.

**Why developers do it:**
Opt-out defaults exploit inertia. Most users do not read every element on a page.
Pre-checked paid options can generate significant ancillary revenue with minimal
apparent user resistance.

**What goes wrong:**
The EU Consumer Rights Directive (Article 22) explicitly prohibits pre-ticked
checkboxes that result in additional payments: "The trader shall seek the express
consent of the consumer to any extra payment in addition to the remuneration agreed
upon." Ryanair was forced by the European Commission to change its practices. In the
US, pre-selected paid options violate FTC guidance on negative option marketing.

**The fix:**
All paid options must default to unchecked/unselected. The user must take affirmative
action (clicking, tapping, checking) to add any paid item or service. This is not a
recommendation -- it is a legal requirement in the EU and an enforceable standard in
the US.

**Detection rule:**
If any checkbox, toggle, or radio button that results in a monetary charge is in a
selected/checked state by default, this is AP-18. No exceptions.

---

### AP-19: Disguised Data Collection

**Also known as:** Dark consent, permission creep, surveillance by default
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Very Hard

**What it looks like:**
The application collects data beyond what is needed for the stated purpose, disguised
as a required step. A flashlight app requests contacts, camera, and location. A
checkout form asks for birth date and phone number as "required" fields when they are
not needed for the transaction. Analytics and tracking pixels are loaded without
disclosure or consent.

**Why developers do it:**
More data enables better targeting, personalization, and monetization. Collecting data
"while we can" is treated as free option value. Product teams fear that if they ask
for data later, users will decline.

**What goes wrong:**
Path (social network) was fined $800,000 by the FTC for secretly collecting entire
address books from users' mobile devices without consent. Google was fined 50 million
euros by France's CNIL under GDPR for lack of transparency in data collection. Under
GDPR's data minimization principle (Article 5(1)(c)), collecting data beyond what is
necessary for the stated purpose is illegal. The CCPA requires businesses to disclose
at the point of collection what data is being collected and why.

**The fix:**
Collect only the data necessary for the stated function. Mark truly optional fields
as "Optional." Never mark data as "required" unless the feature literally cannot
function without it. Disclose all tracking and analytics. Obtain informed consent
before collecting any data beyond the minimum required.

**Detection rule:**
If a form marks fields as "required" that are not necessary for the core function
(e.g., birth date on a shipping form, phone number on a digital download), or if the
app requests device permissions unrelated to its core function, this is AP-19.

---

### AP-20: Interface Interference

**Also known as:** Visual manipulation, action ambiguity, toggleware
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**
The interface deliberately makes it ambiguous which option does what. Toggle switches
where "on" and "off" states are visually indistinguishable. Buttons that change
position between screens so muscle memory causes the user to click the wrong one.
Dialogs where "Yes" and "No" are swapped from the standard OS convention. Tiny close
buttons on overlays.

```html
<!-- DARK PATTERN: Ambiguous toggle -->
<div class="toggle">
  <span class="gray">Share data</span>
  <!-- Is this on or off? The gray color is ambiguous -->
  <div class="toggle-track bg-gray-400">
    <div class="toggle-thumb" style="left: 0"></div>
  </div>
</div>
```

**Why developers do it:**
Ambiguity benefits the default (which is usually the business-preferred option). If
users cannot tell whether they have opted in or out, they tend to leave the setting
as-is, which is typically the privacy-invasive or revenue-generating default.

**What goes wrong:**
The Mathur et al. study (Princeton/University of Chicago, 2019) identified "interface
interference" as one of the five high-level categories of dark patterns across 11,000
websites. The EU Digital Services Act Article 25 specifically prohibits practices that
"give more prominence to certain choices" or make "the procedure for terminating a
service more difficult than subscribing to it." GDPR enforcement bodies have fined
companies for consent interfaces where the opt-out state was visually
indistinguishable from the opt-in state.

**The fix:**
Use clear visual states for all toggles and controls. On/off, yes/no, and opt-in/
opt-out must be unambiguous. Follow platform conventions for button placement (e.g.,
primary action on the right on web, left on iOS). Use color, labels, and icons
together -- never rely on a single visual cue.

**Detection rule:**
If toggle switches lack clear on/off labels, if button positions are inconsistent
between related screens, or if the visual difference between two states of a control
requires careful inspection to distinguish, this is AP-20.

---

## Root Cause Analysis

| Anti-Pattern | Root Cause | Prevention |
|-------------|------------|------------|
| AP-01: Confirm Shaming | Growth team optimizing for conversion without ethical review | Require copy review for all opt-out language; ban self-deprecating decline text |
| AP-02: Roach Motel | Retention KPIs that reward friction over value | Enforce symmetry: cancellation steps <= signup steps |
| AP-03: Forced Continuity | Subscription metrics that reward silent conversions | Mandate pre-charge notifications; show billing terms at signup |
| AP-04: Sneak into Basket | Ancillary revenue targets incentivize stealth add-ons | Default all paid options to unchecked; require affirmative action |
| AP-05: Hidden Costs | Low displayed prices win in competitive comparison | Show total price from first display; include all mandatory fees |
| AP-06: Privacy Zuckering | Data collection maximized for ad targeting/monetization | Symmetric consent UIs; reject-all at parity with accept-all |
| AP-07: Trick Questions | Marketing inflates consent numbers through confusion | Single-positive language only; consistent checkbox logic |
| AP-08: Misdirection | Conversion optimization treats user attention as a resource to exploit | Both options must be real buttons with adequate visual weight |
| AP-09: Urgency/Scarcity Manipulation | Short-term conversion pressure from growth targets | Only display factually accurate, API-driven urgency data |
| AP-10: Obstruction | Retention economics reward friction in exit flows | Channel symmetry: exit via same method as entry |
| AP-11: Disguised Ads | Native ad revenue dramatically exceeds labeled ad revenue | Clear "Ad" labels; visually distinct ad styling |
| AP-12: Friend Spam | Viral growth metrics incentivize contact exploitation | Explicit per-message approval; preview before send |
| AP-13: Bait and Switch | Sunk cost exploitation drives post-investment conversion | Disclose all costs before user invests time |
| AP-14: Nagging | Aggregate conversion from repeated prompts appears "free" | Permanent "Don't show again" option; respect dismissal |
| AP-15: Comparison Prevention | Price obfuscation protects margins from informed comparison | Aligned comparison tables; same billing units across tiers |
| AP-16: Default to Most Expensive | Default acceptance rates (70-90%) directly increase ARPU | Default to cheapest or no selection |
| AP-17: Emotional Manipulation | Emotional copy outperforms neutral copy on short-term metrics | Neutral professional language in all exit flows |
| AP-18: Pre-Selected Paid Options | Opt-out defaults exploit user inertia for ancillary revenue | All paid items default to unselected (EU law requires this) |
| AP-19: Disguised Data Collection | "Collect now, use later" treated as free option value | Data minimization; only required fields marked required |
| AP-20: Interface Interference | Ambiguity benefits the business-preferred default | Clear visual states; platform conventions; labels + color + icons |

### Underlying Drivers

The root causes above share three structural drivers:

1. **Metric misalignment** -- When teams are measured on conversion rate, retention
   rate, or data collected, without a countervailing metric for user trust, ethical
   compliance, or regulatory risk, dark patterns become the "rational" optimization.

2. **Asymmetric A/B testing** -- Dark patterns almost always "win" A/B tests on
   short-term metrics. The damage (brand erosion, regulatory fines, churn from
   resentment) is not captured in the test's time horizon.

3. **Diffusion of responsibility** -- The PM writes the spec, the designer creates
   the mock, the developer implements it, the QA verifies it works. No single person
   owns the ethical evaluation. An AI agent asked to implement a dark pattern is often
   the last checkpoint before it ships.

---

## Self-Check Questions

An AI agent should ask these questions before implementing any user-facing flow:

1. **Symmetry test:** Is the exit path (cancel, unsubscribe, delete) as simple as
   the entry path (subscribe, sign up, create)?
2. **Neutral language test:** If I read the opt-out copy aloud, does it sound
   manipulative, guilt-tripping, or condescending?
3. **Prominence test:** Are both the accept and decline options visible, clearly
   labeled, and of comparable visual weight?
4. **Default test:** Do any pre-selected options result in the user spending money
   or sharing data they did not explicitly choose to?
5. **Transparency test:** Are all costs, fees, and charges visible from the moment a
   price is first displayed, or are some revealed only at checkout?
6. **Consent test:** Is consent obtained through clear affirmative action, or through
   confusing language, pre-checked boxes, or double negatives?
7. **Urgency test:** Are timers, stock counts, and scarcity messages driven by real
   backend data, or are they hardcoded/fabricated?
8. **Data minimization test:** Is every "required" field actually needed for the
   function to work, or are some collecting data beyond what is necessary?
9. **Persistence test:** Does a dismissed prompt stay dismissed, or does it reappear?
   Is there a permanent opt-out?
10. **Channel symmetry test:** Can the user accomplish the exit action through the same
    channel (web, app) they used for the entry action, or are they forced to call,
    email, or mail?
11. **Label accuracy test:** Does every button, link, and control do exactly what its
    label says it does?
12. **Comparison test:** Can a user compare all available options (plans, pricing,
    features) in a single view with consistent units?
13. **Contact permission test:** If the app requests access to contacts, does it show
    the user exactly what will be sent before sending anything?
14. **Emotional neutrality test:** Does the cancellation or opt-out flow use
    emotional language, sad imagery, or guilt-inducing copy?
15. **Toggle clarity test:** Can a user immediately tell whether a toggle or checkbox
    is in its on or off state without careful inspection?

---

## Code Smell Quick Reference

| If you see... | Suspect... | Verify... |
|---------------|-----------|-----------|
| Opt-out text containing "I don't want to," "No thanks, I prefer to," or self-deprecating language | AP-01: Confirm Shaming | Does the decline copy shame the user for their choice? |
| Cancellation flow with 4+ screens/steps | AP-02: Roach Motel | Compare step count with signup flow; flag if cancel > 2x signup |
| Payment info collected for "free trial" without visible post-trial price and date | AP-03: Forced Continuity | Are billing terms shown in the same visual block as the signup CTA? |
| `<input type="checkbox" checked>` for any paid add-on | AP-04/AP-18: Sneak into Basket / Pre-Selected Paid | Does the default-checked item cost money? |
| Mandatory fees appearing only at the final checkout step | AP-05: Hidden Costs | Is the total price (all fees included) shown from first display? |
| "Accept All" as a large button, "Reject" as a small link | AP-06: Privacy Zuckering | Are accept and reject at visual parity? |
| Checkbox labels containing "not," "un-," or double negatives | AP-07: Trick Questions | Is the checkbox logic clear and single-positive? |
| Primary CTA is a large styled button, alternative is unstyled tiny text | AP-08: Misdirection | Is the user-beneficial option a real, visible button? |
| Countdown timer initialized from hardcoded value, not API | AP-09: Urgency Manipulation | Does the timer reset? Is it connected to a real deadline? |
| Cancellation requiring phone call, mail, or different channel than signup | AP-10: Obstruction | Can the user exit through the same channel they entered? |
| Clickable elements styled as content without "Ad" or "Sponsored" label | AP-11: Disguised Ads | Is ad content clearly distinguishable from editorial content? |
| "Import contacts" flow that sends messages without per-message preview | AP-12: Friend Spam | Does the user approve the exact message before it is sent? |
| Close/dismiss button that triggers an action instead of dismissing | AP-13: Bait and Switch | Does every button do exactly what its label says? |
| Dismissed dialog reappearing with no permanent suppress option | AP-14: Nagging | Is there a working "Don't show again" mechanism? |
| Pricing page requiring input before showing any price | AP-15: Comparison Prevention | Can all plans be compared in a single view? |
| Most expensive plan pre-selected in a plan chooser | AP-16: Default to Most Expensive | Is the default selection based on user needs or margin? |
| Sad mascots, crying emojis, or guilt language in exit flows | AP-17: Emotional Manipulation | Is the exit flow copy emotionally neutral? |
| Form marking birthday, phone as "required" for a digital download | AP-19: Disguised Data Collection | Is every required field necessary for the core function? |
| Toggle switch with ambiguous on/off visual state | AP-20: Interface Interference | Can the user immediately tell the toggle state? |

---

## Regulatory Landscape Summary

| Jurisdiction | Law/Regulation | Dark Pattern Provisions | Penalties |
|-------------|---------------|------------------------|-----------|
| **US (Federal)** | FTC Act Section 5, ROSCA | Deceptive and unfair trade practices; dark patterns in subscriptions | Civil penalties per violation; consent decrees (Vonage: $100M, Epic: $245M) |
| **US (Federal)** | FTC Click-to-Cancel Rule (2024) | Cancellation must be as easy as signup (vacated by 8th Circuit July 2025, but FTC can still enforce under Section 5 and ROSCA) | Civil penalties |
| **US (California)** | CCPA/CPRA | Dark patterns defined as interfaces that "subvert or impair user autonomy"; consent obtained via dark patterns is void | $2,500 per violation; $7,500 per intentional violation |
| **US (Colorado)** | CPA | Consent obtained via dark patterns is not valid consent | AG enforcement |
| **US (Virginia)** | VCDPA | Similar to CCPA dark pattern provisions | AG enforcement |
| **EU** | Digital Services Act (Art. 25) | Prohibits designs that "distort or impair autonomy, decision-making, or choice" | Up to 6% of global annual revenue |
| **EU** | Consumer Rights Directive (Art. 22) | Pre-ticked checkboxes for additional payments prohibited | Member state enforcement |
| **EU** | GDPR | Consent must be freely given, specific, informed, unambiguous; dark pattern consent is void | Up to 4% of global annual revenue or 20M euros |
| **EU** | Digital Fairness Act (proposed, ~2026) | Expanded dark pattern prohibitions; platforms must prove urgency claims are factual | TBD |
| **India** | Consumer Protection Act (2019) + Guidelines | Dark patterns guidelines issued 2023; 13 categories of prohibited dark patterns | Penalties under consumer protection law |

---

## Agent Behavioral Protocol

When an AI agent identifies a dark pattern in a specification, design, or code it is
asked to implement, it should follow this protocol:

```
1. IDENTIFY   — Name the specific dark pattern (AP-01 through AP-20)
2. CITE       — Reference the regulatory risk (FTC, DSA, CCPA, GDPR)
3. REFUSE     — Decline to implement the manipulative element
4. PROPOSE    — Offer an ethical alternative that achieves the legitimate
                business goal without deception
5. ESCALATE   — If the requester insists, note that implementation would
                create legal liability and recommend legal review
```

Example agent response:

> "This specification asks me to implement a cancellation flow with 7 steps including
> a required phone call. This matches AP-02 (Roach Motel) and AP-10 (Obstruction).
> The FTC fined Vonage $100 million for a similar pattern, and sued Amazon over its
> 'Iliad' cancellation flow. I recommend a 2-step cancellation flow with an optional
> retention survey. I cannot implement the requested flow as specified."

---

*Researched: 2026-03-08 | Sources: FTC enforcement actions (Amazon, Vonage, Epic Games, Adobe), EU Digital Services Act Article 25, CCPA/CPRA dark pattern definitions, CPPA Enforcement Advisory (September 2024), Harry Brignull / deceptive.design taxonomy, Mathur et al. (Princeton/UChicago, 2019) study of 11,000 websites, EU Consumer Rights Directive Article 22, GDPR Articles 5-7, LinkedIn $13M class-action settlement, FTC Click-to-Cancel Rule (October 2024)*

Sources:
- [FTC Action Against Vonage — $100 Million Settlement](https://www.ftc.gov/news-events/news/press-releases/2022/11/ftc-action-against-vonage-results-100-million-customers-trapped-illegal-dark-patterns-junk-fees-when-trying-cancel-service)
- [FTC v. Amazon (ROSCA) — Prime Dark Patterns Complaint](https://www.ftc.gov/legal-library/browse/cases-proceedings/2123050-amazoncom-inc-rosca-ftc-v)
- [FTC Action Against Adobe — Hidden Fees and Cancellation Barriers](https://www.ftc.gov/news-events/news/press-releases/2024/06/ftc-takes-action-against-adobe-executives-hiding-fees-preventing-consumers-easily-cancelling)
- [FTC v. Epic Games — $245 Million Dark Patterns Settlement](https://www.ftc.gov/business-guidance/blog/2022/12/245-million-ftc-settlement-alleges-fortnite-owner-epic-games-used-digital-dark-patterns-charge)
- [CPPA Enforcement Advisory on Dark Patterns (September 2024)](https://cppa.ca.gov/announcements/2024/20240904.html)
- [EU Digital Services Act — Dark Pattern Prohibition](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)
- [Deceptive Patterns (Harry Brignull) — Taxonomy and Case Database](https://www.deceptive.design/)
- [LinkedIn $13M Dark Patterns Settlement — Friend Spam](https://www.fastcompany.com/3051906/after-lawsuit-settlement-linkedins-dishonest-design-is-now-a-13-million-problem)
- [Dark Patterns Lawsuits and FTC Click-to-Cancel Rule](https://www.coulsonpc.com/coulson-pc-blog/dark-patterns-ftc-click-to-cancel-rule)
- [EU Regulating Dark Patterns — Towards Digital Fairness](https://www.europarl.europa.eu/RegData/etudes/ATAG/2025/767191/EPRS_ATA(2025)767191_EN.pdf)
- [Dark Patterns on Booking.com — Manipulation Tactics](https://behavioralinsight.substack.com/p/dark-patterns-on-bookingcom-manipulation)
- [2024 Most Notable FTC Actions Against Dark Patterns](https://www.goodwinlaw.com/en/news-and-events/news/2024/12/announcements-finance-fs-2024-most-notable-ftc-actions-against-dark-patterns-and-ai)

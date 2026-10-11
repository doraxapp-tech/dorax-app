/* Dorax Finance — Help (owner, 2026-10-10, the first batch of "what more can help": until then Help opened the contact form, so a question was a
   message to wait for). Now Help is the questions people ask about their money, in their words (claude/preguntas-finanzas-vs-dorax-2026-10-09.md),
   each with its answer in one line and a tap to the screen that answers it. The screen's own introduction can be seen again, and writing to Dorax
   is at the end, for what is not here. Each side has its own questions: the company's speaks of costs, runway and reserves. */
/** [key, question, answer]. The key is what help-go does (help.actions.js). */
function helpQuestions() {
  const co = UI.space === 'business';
  return [
    ['month', co ? t('How is the company doing this month?') : t('How much do I have left this month?'), co ? t('The Summary shows what came in, what went out and what is left.') : t('The Summary shows what came in, what went out and what is left, and what is still to pay.')],
    ['where', co ? t('Where does the company’s money go?') : t('Where does my money go?'), t('Reports shows your largest spending by category, month against month.')],
    ['limit', t('How do I set a spending limit?'), t('Choose a category and how much a month. Dorax lets you know at 80% and if you go over.')],
    ['runway', co ? t('How long can the company run without income?') : t('How many months could I live without income?'), co ? t('The company’s runway, in the Summary: what it keeps, in days and months.') : t('Days of freedom, in the Summary: your emergency fund in days and months.')],
    ['goal', co ? t('When does a reserve reach its target?') : t('When do I reach my goal?'), t('Each goal says how much to set aside a month and the month you get there.')],
    ['due', t('What is still to pay?'), t('The Plan has your fixed costs, their due day and a reminder before each one.')],
    ...(co ? [] : [['debt', t('How do I get out of debt?'), t('The Journey: write your debts, do short sprints and see the month you are free.')]]),
    ['record', t('How do I record an expense quickly?'), t('Tap + and write one line: “taxi 15”.')],
    ['import', t('How do I bring my bank statement?'), t('Imports: choose the OFX or CSV file and Dorax sorts it; you only check what is unclear.')],
    ['sides', t('How do I keep the company apart from home?'), hasCompany() ? t('The button with two arrows switches sides: the two never mix.') : t('Open a company account: its money has its own side and never mixes with home.')],
    ['notify', t('How do I choose my reminders and notifications?'), t('In your profile, under Reminders: what, how early, and the tips.')],
    ['safe', t('Is my data safe?'), t('No ads and no data sold. Add a PIN, Face ID or fingerprint in your profile; hide the amounts with the eye.')],
  ];
}
function helpDrawer() {
  const again = typeof tourText === 'function' && tourText(UI.route) ? `<button class="hp-row hp-tour" data-a="help-tour"><span class="hp-ic">${icon('bulb')}</span><span class="grow"><b>${t('See this screen’s introduction again')}</b></span><span class="mr-chev" aria-hidden="true">${icon('right')}</span></button>` : '';
  return `<div class="body hp">
      <p class="note">${t('The questions people ask most, and where Dorax answers them.')}</p>
      <ul class="hp-list">${helpQuestions().map(([k, q, a]) => `<li><button class="hp-row" data-a="help-go" data-v="${k}"><span class="grow"><b>${q}</b><small>${a}</small></span><span class="mr-chev" aria-hidden="true">${icon('right')}</span></button></li>`).join('')}</ul>
      ${again}
      <div class="hp-write"><b>${t('Didn’t find your answer?')}</b><p class="note">${t('Write to us: a person reads it.')}</p><button class="btn" data-a="contact">${icon('mail')}${t('Write to Dorax')}</button></div>
    </div>`;
}

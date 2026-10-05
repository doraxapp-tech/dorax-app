/* Dorax Finance — what each part of the app is for. One (i) next to every card and figure (owner, v36: "people need to be able to know what all the parts
   of the app do"). The dashboard's hints are written where the dashboard is built; every other screen takes its text from here.
   Each text says what the part shows or counts and what can be done there, in plain words; none of them gives advice. */
const HINTS = {
  // transactions
  tx: () => t('Every movement in your accounts: typed by hand, imported from a statement or recorded as a payment. Search by merchant or amount, use Filters to narrow the list, choose a column heading to sort, and open a row to change it. Company accounts appear only when you choose them in Filters.'),
  // plan
  planFixed: () => t('The total of the fixed costs planned for this month: every line of the yearly table below.'),
  planPaid: () => t('What has been paid this month so far, from the payments you recorded and the transactions matched to a fixed cost.'),
  planLeft: () => t('What is planned for this month and has no payment yet.'),
  planNet: () => t('The income you send to fixed costs, minus this month’s fixed costs. Red means that income does not cover them.'),
  planPayments: () => t('This month’s fixed costs, one line each. Record a payment when you pay a bill; a bill paid by an imported transaction is ticked by itself. A budget, such as groceries, is spent little by little and shows how much of it is used.'),
  planYear: () => t('Every fixed cost, month by month, for the whole year. Plan is what you expect to pay, Actual is what was paid, Difference compares the two. Type in a cell to change one month; open a line by its name to change it from a month onwards or to end it.'),
  // savings and goals
  goalSaved: () => t('Everything you have put aside in your goals and funds: contributions minus withdrawals.'),
  goalPlan: () => t('What the monthly plan sets aside for goals and funds this month.'),
  goalDone: () => t('Contributions minus withdrawals recorded this month. A starting balance is not counted.'),
  goalRest: () => t('The income for savings of this month that the plan gives to no goal or fund. Red means the plan hands out more than comes in.'),
  goalDist: () => t('When the money for savings arrives, hand it out here. Each line shows what the plan gives that goal this month; record the amounts and they are added to each goal.'),
  goalCards: () => t('A goal has a target and a date. A fund is money kept for a purpose, with no end. Open one to see its movements, add or withdraw money, or change it.'),
  goalGrid: () => t('How much of each month’s savings goes to each goal or fund, for the whole year. Type in a cell to change one month.'),
  goalWhere: () => t('Which account holds the money of each goal or fund, so you know where to find it.'),
  // investments
  fiiInvested: () => t('What you paid for the quotas you hold now, at your average price.'),
  fiiValue: () => t('The same quotas at the prices you typed. Dorax does not fetch market prices.'),
  fiiIncome: () => t('The income (distributions) you recorded this year.'),
  fiiMonthly: () => t('What your quotas pay in a month, by the last distribution per quota recorded for each fund.'),
  fiiPosition: () => t('One line per fund: quotas, average price, the price you typed and the result. Open a fund to see its history or to change its price.'),
  fiiMonth: () => t('What each fund paid or should pay this month, by quota. Record the income when it arrives.'),
  fiiReceived: () => t('The income received in each of the last months. Choose a bar to open that month.'),
  fiiSim: () => t('Try a purchase before making it: how many quotas an amount buys and how much monthly income it would add, at the last distribution. Nothing is recorded.'),
  fiiMoves: () => t('Every purchase, sale and income you recorded, newest first.'),
  // reports
  repIncome: () => t('Money that came into your household accounts in this month.'),
  repExpenses: () => t('What was spent from your household accounts in this month. Transfers between your own accounts and money put into goals are not counted.'),
  repSaved: () => t('Income minus expenses of this month.'),
  repRate: () => t('The share of this month’s income that was not spent.'),
  repLargest: () => t('Where most of the money went this month, and each line’s share of all the spending.'),
  repObs: () => t('What changed this month compared with the one before, worked out from your transactions. These are facts, not advice.'),
  repCompare: () => t('Each category in this month next to the month before, with the difference.'),
  // accounts
  accNet: () => t('The balances of your household accounts added together. What a credit card owes is subtracted.'),
  accCompany: () => t('The balances of the company accounts in this currency. They never enter the household figures.'),
  accCount: () => t('How many accounts are kept here.'),
  accHouse: () => t('Your own accounts and cards. A balance is the opening balance plus every transaction recorded since.'),
  accBiz: () => t('The accounts of your company. They are kept apart: their movements count in no household figure.'),
  // imports
  impSheet: () => t('Bring the spreadsheet where you keep your budget. Dorax reads its tabs and proposes fixed costs, income, goals and investment records; nothing enters your data until you approve it.'),
  impReview: () => t('Each row is one transaction from the file. Accept the ones to import and ignore the rest; a row that may already be in the account is marked.'),
  impFound: () => t('What Dorax found in the spreadsheet, tab by tab. Choose what to bring in; nothing else is imported.'),
  impHistory: () => t('Every file you imported: when, into which account, and how many of its rows were new or already there.'),
  // statement converter
  convMonthly: () => t('The accounts whose statement you send every month, one column each. “Prepare OFX” converts that month’s statement and “Mark as sent” ticks it off. An account joins this list when you answer yes after a conversion, or in the account’s own settings.'),
  convHistory: () => t('The OFX files made here, newest first.'),
  convReview: () => t('Each row is one transaction that goes into the OFX file. Verified rows were read with certainty; rows that need review wait for your decision; rows already in the app’s ledger are marked, so nothing is counted twice.'),
  convFile: () => t('Choose the statement file, the account it belongs to and the OFX profile to write it with. The file is read in your browser.'),
  convCols: () => t('Say which column of the file is the date, which the description and which the amount. The preview shows how each line is read with your choices.'),
  convReady: () => t('What went into the file: the account, the period, the closing balance and the profile used. Download it, or copy its text.'),
  convChecks: () => t('What is checked in the file before it can be downloaded: its structure, the dates, the amounts, that every transaction has its own ID, and the closing balance. A file that fails is not offered for download.'),
  convPreview: () => t('The exact text of the OFX file, as the accounting platform will read it.'),
  // recurring
  recCount: () => t('Payments that repeat every month: the ones Dorax found in your transactions and the ones you added.'),
  recTotal: () => t('What these payments add up to in a month.'),
  recDue: () => t('The total of the ones expected in the next 30 days.'),
  recNext: () => t('The day the next one is expected.'),
  recList: () => t('A payment is listed when the same merchant appears in at least 3 of the last 4 months with a similar amount and day. “Not recurring” takes one off the list.'),
  recAdd: () => t('Add a payment that repeats but has not shown up in your transactions yet.'),
  // categories and rules
  catCats: () => t('Categories group your spending on the dashboard and in the reports; subcategories split a category further. Rename them as you like. The number is how many transactions use each one.'),
  catRules: () => t('A rule files transactions for you. When the bank’s text of a transaction contains the keyword, the transaction gets the merchant name and the category of the rule. Rules are applied when a statement is imported; if two rules match, the one with the higher priority wins.'),
  catAdd: () => t('Example: keyword UBER, merchant Uber, category Transport. From then on, every imported line whose text contains UBER is named Uber and filed under Transport by itself.'),
  firstSteps: () => t('The four things that make the app useful, in order. Each is ticked when it is done.'),
  // settings
  setLang: () => t('The language of the app, light or dark, and how numbers and dates are written.'),
  setProfiles: () => t('What an OFX file says about each account. You only need this if your accounting platform refuses a file.'),
  setImport: () => t('Choices used when statements are imported or converted.'),
  setData: () => t('Where your data is kept, how to take a copy of it and how to erase it.'),
  // profile
  proYou: () => t('Your name, as the app greets you.'),
  proTone: () => t('How the app’s messages are worded. The information is the same in both.'),
  proLogin: () => t('The email you log in with, and how you log in: a password, Google, or both. Changing the email sends a link to the new address.'),
  proRemind: () => t('Which reminders you get, and how many days before a due day they start.'),
  proDelete: () => t('Erases this account and everything in it. It cannot be undone.'),
};
const hint = k => info(HINTS[k]());

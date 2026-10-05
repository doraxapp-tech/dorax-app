/* Dorax Finance — calculations: statements owed to an accountant every month. */
/** Statements owed to an accounting platform: those of a month are sent between day 1 and `day` (15) of the following month. */
/** Whether the statement of an account is sent to an accountant every month. The person says so, per account (v32): nothing about the account implies it.
    `monthlySince` is the first month it counts for, so an account put on the list today is not late for the months before.
    Accounts saved before v32 carry no answer; for them the earlier rule stands (a company account, unless the platform read it by itself) until the account is edited. */
function owesStatement(a, ym) { const on = a.monthly === undefined ? a.scope === 'business' && !a.integrated : !!a.monthly; return on && (!ym || !a.monthlySince || a.monthlySince <= ym); }
function closeDue(ym, day) { return isoDate(addMonths(ym, 1), day || 15); }

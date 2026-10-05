/* Dorax Finance — voice.
   The app talks like a straight-talking friend: warm, direct, a little humour, zero guilt.
   Rules:
   1. Say what happened first, in plain words. The friendly part comes second and is short.
   2. Humour only where nothing is at stake: something got done, a list is empty, a month is quiet.
      Never in a delete confirmation, never when money does not add up, never about how someone spends.
   3. No advice. The app states the numbers; what to do with them is the person's call.
   4. Errors say what is wrong and what to type instead, like a friend looking over your shoulder. No blame, no "invalid".
   5. Numbers are exact, whatever the tone.
   Each row replaces the plain wording of one message when the person's tone is "friend" (the default).
   People who prefer plain wording switch it off in their profile; the numbers and the meaning are the same either way.
   Row: [message key (plain English), English, Español, Português]. */
const VOICE_ROWS = [
  // something got done
  ['Transaction saved.', 'Saved. All in order.', 'Guardado. Todo en orden.', 'Salvo. Tudo em ordem.'],
  ['Transaction added.', 'Added. One more on the record.', 'Agregada. Una más en el registro.', 'Adicionada. Mais uma no registro.'],
  ['Transaction deleted.', 'Deleted. It no longer counts in your totals.', 'Eliminada. Ya no cuenta en tus totales.', 'Excluída. Já não conta nos seus totais.'],
  ['{name} paid: {amount} from {account}.', '{name} paid. One less. ({amount} from {account})', '{name} pagado. Uno menos. ({amount} desde {account})', '{name} pago. Um a menos. ({amount} de {account})'],
  ['{n} payment recorded: {amount}.', '{n} payment recorded: {amount}. One less.', '{n} pago registrado: {amount}. Uno menos.', '{n} pagamento registrado: {amount}. Um a menos.'],
  ['{n} payments recorded: {amount}.', '{n} payments in one go: {amount}. Nicely done.', '{n} pagos de un tirón: {amount}. Bien ahí.', '{n} pagamentos de uma vez: {amount}. Boa.'],
  ['Payment recorded.', 'Payment recorded. One less.', 'Pago registrado. Uno menos.', 'Pagamento registrado. Um a menos.'],
  ['Expense recorded.', 'Noted.', 'Anotado.', 'Anotado.'],
  ['Fixed cost added.', 'Added. It shows up in your payments every month from now on.', 'Agregado. Desde ahora aparece cada mes en tus pagos.', 'Adicionado. A partir de agora aparece todo mês nos seus pagamentos.'],
  ['Contribution recorded.', 'Contribution recorded. Closer than yesterday.', 'Aporte registrado. Más cerca que ayer.', 'Aporte registrado. Mais perto que ontem.'],
  ['{n} contribution recorded.', '{n} contribution recorded. Closer than yesterday.', '{n} aporte registrado. Más cerca que ayer.', '{n} aporte registrado. Mais perto que ontem.'],
  ['{n} contributions recorded.', '{n} contributions recorded. Your goals noticed.', '{n} aportes registrados. Tus metas lo notaron.', '{n} aportes registrados. Suas metas perceberam.'],
  ['Withdrawal recorded.', 'Withdrawal recorded. That is what it was there for.', 'Retiro registrado. Para eso estaba.', 'Retirada registrada. Era para isso que estava lá.'],
  ['Goal created.', 'Goal created. With a name it is already more real.', 'Meta creada. Con nombre ya es más real.', 'Meta criada. Com nome já fica mais real.'],
  ['Goal marked as completed.', 'Goal completed. This one deserves a moment.', 'Meta cumplida. Esta merece un momento.', 'Meta cumprida. Essa merece um momento.'],
  ['Income recorded.', 'Income recorded. Money that arrived on its own.', 'Rendimiento registrado. Dinero que llegó solo.', 'Rendimento registrado. Dinheiro que chegou sozinho.'],
  ['{n} income recorded: {amount}.', '{n} income recorded: {amount}. Money that arrived on its own.', '{n} rendimiento registrado: {amount}. Dinero que llegó solo.', '{n} rendimento registrado: {amount}. Dinheiro que chegou sozinho.'],
  ['{n} incomes recorded: {amount}.', '{n} incomes recorded: {amount}. Money that arrived on its own.', '{n} rendimientos registrados: {amount}. Dinero que llegó solo.', '{n} rendimentos registrados: {amount}. Dinheiro que chegou sozinho.'],
  ['Copied to clipboard.', 'Copied.', 'Copiado.', 'Copiado.'],
  // the month at a glance
  // nothing here
  ['Nothing to pay or to do in the next 30 days.', 'Nothing due in the next 30 days. Enjoy the quiet.', 'Nada vence en los próximos 30 días. Disfruta la calma.', 'Nada vence nos próximos 30 dias. Aproveite a calma.'],
  ['Nothing notable this month.', 'Nothing unusual this month. Boring is good.', 'Nada raro este mes. Aburrido es bueno.', 'Nada fora do comum este mês. Tédio é bom.'],
  ['No goals yet', 'Nothing to save for yet?', '¿Todavía sin metas?', 'Ainda sem metas?'],
  ['No transactions match these filters', 'Nothing matches those filters', 'Nada coincide con esos filtros', 'Nada corresponde a esses filtros'],
  ['No transactions yet', 'Nothing here yet', 'Aquí todavía no hay nada', 'Ainda não há nada aqui'],
  ['No FIIs yet', 'No funds here yet', 'Aquí todavía no hay fondos', 'Ainda não há fundos aqui'],
  // something is off: what is wrong and what to type instead
  ['Enter an amount greater than zero, for example 185,42.', 'That amount does not work. Try something above zero, like 185,42.', 'Ese importe no me sirve. Prueba con algo mayor que cero, como 185,42.', 'Esse valor não serve. Tente algo maior que zero, como 185,42.'],
  ['Enter the amount as a number, for example 1500 or 9,90.', 'Numbers only there, like 1500 or 9,90.', 'Ahí solo números, como 1500 o 9,90.', 'Aí só números, como 1500 ou 9,90.'],
  ['Enter a valid date.', 'I cannot read that date. Pick it from the calendar.', 'No entiendo esa fecha. Elígela en el calendario.', 'Não entendi essa data. Escolha no calendário.'],
  ['The date cannot be in the future.', 'That date has not happened yet. Use today or earlier.', 'Esa fecha todavía no llega. Usa hoy o una anterior.', 'Essa data ainda não chegou. Use hoje ou uma anterior.'],
  ['You cannot withdraw more than is saved ({amount}).', 'There is only {amount} saved here. You can take out up to that.', 'Aquí solo hay {amount} ahorrados. Puedes retirar hasta eso.', 'Aqui só há {amount} guardados. Você pode retirar até isso.'],
  ['Add an account first.', 'Add an account first. It takes a minute.', 'Primero agrega una cuenta. Es un minuto.', 'Primeiro adicione uma conta. É um minuto.'],
  ['Enter a name for the goal.', 'The goal needs a name. Anything you will recognise.', 'La meta necesita un nombre. Cualquiera que reconozcas.', 'A meta precisa de um nome. Qualquer um que você reconheça.'],
  ['Enter a name for the fixed cost.', 'It needs a name. “Rent” is a fine one.', 'Necesita un nombre. “Alquiler” ya sirve.', 'Precisa de um nome. “Aluguel” já serve.'],
  // v9: spreadsheet import, due days, reminders
  ["{n} rows imported from your spreadsheet.", "{n} rows in. Your sheet can rest now.", "{n} filas adentro. Tu hoja ya puede descansar.", "{n} linhas para dentro. Sua planilha já pode descansar."],
  ["{n} due days saved. Reminders follow them.", "{n} due days saved. I’ll keep an eye on them from here.", "{n} días de vencimiento guardados. De aquí en adelante los vigilo yo.", "{n} dias de vencimento salvos. Daqui para frente eu fico de olho."],
  ["{n} due day saved. Reminders follow it.", "{n} due day saved. I’ll keep an eye on it from here.", "{n} día de vencimiento guardado. De aquí en adelante lo vigilo yo.", "{n} dia de vencimento salvo. Daqui para frente eu fico de olho."],
  ["Nothing to chase today", "Nothing to chase today. Enjoy it.", "Hoy no hay nada que perseguir. Disfrútalo.", "Hoje não há nada para correr atrás. Aproveite."],
];
const VOICE = { en: {}, es: {}, pt: {} };
VOICE_ROWS.forEach(([k, en, es, pt]) => { VOICE.en[k] = en; VOICE.es[k] = es; VOICE.pt[k] = pt; });

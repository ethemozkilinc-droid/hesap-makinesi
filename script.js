(() => {
  'use strict';
  const result = document.querySelector('#result');
  const expression = document.querySelector('#expression');
  const message = document.querySelector('#message');
  const historyList = document.querySelector('#history');
  const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  let current = '0', stored = null, operator = null, fresh = false, failed = false;
  let history = [];
  try {
    const saved = JSON.parse(localStorage.getItem('hesap-history') || '[]');
    if (Array.isArray(saved)) history = saved.filter(item => item && typeof item.expression === 'string' && typeof item.value === 'number' && Number.isFinite(item.value)).slice(0, 30);
  } catch { /* Depolama kapalıysa uygulama bellekte çalışır. */ }
  const format = value => {
    const [integer, decimal] = String(value).split('.');
    if (String(value).includes('e')) return String(value).replace('.', ',');
    return Number(integer).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + (decimal !== undefined ? ',' + decimal : '');
  };
  function render() {
    result.textContent = failed ? 'Hata' : format(current);
    document.querySelectorAll('[data-operator]').forEach(button => button.classList.toggle('selected', button.dataset.operator === operator));
  }
  function reset() {
    current = '0'; stored = null; operator = null; fresh = false; failed = false;
    expression.textContent = '\u00a0'; message.textContent = 'Hadi, bir hesap yapalım.';
  }
  function saveHistory() {
    try { localStorage.setItem('hesap-history', JSON.stringify(history)); } catch { /* Bellekteki geçmiş korunur. */ }
  }
  function renderHistory() {
    historyList.replaceChildren();
    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-history';
      empty.innerHTML = '<span class="empty-icon" aria-hidden="true">↶</span><strong>Henüz bir işlem yok.</strong><span>İlk hesabını yap,<br>sonucunu burada saklayalım.</span>';
      historyList.append(empty);
    }
    history.forEach(item => {
      const button = document.createElement('button');
      button.className = 'history-item';
      const calculation = document.createElement('span');
      calculation.textContent = item.expression + ' =';
      const value = document.createElement('strong');
      value.textContent = format(item.value);
      button.append(calculation, value);
      button.title = 'Bu sonucu kullan';
      button.addEventListener('click', () => {
        reset(); current = String(item.value); fresh = true;
        message.textContent = 'Geçmişteki sonuç kullanılıyor.'; render();
      });
      historyList.append(button);
    });
  }
  function calculate() {
    if (!operator || stored === null || fresh) return;
    const left = stored, right = Number(current), op = operator;
    const label = `${format(left)} ${symbols[op]} ${format(current)}`;
    if (op === '/' && right === 0) {
      failed = true; operator = null; stored = null;
      expression.textContent = label; message.textContent = 'Bir sayı sıfıra bölünemez.'; return;
    }
    const raw = op === '+' ? left + right : op === '-' ? left - right : op === '*' ? left * right : left / right;
    if (!Number.isFinite(raw)) {
      failed = true; operator = null; stored = null;
      message.textContent = 'Sonuç hesaplama sınırını aştı.'; return;
    }
    const value = Number(raw.toPrecision(12));
    current = String(value); expression.textContent = label + ' =';
    history.unshift({ expression: label, value }); history = history.slice(0, 30);
    saveHistory(); renderHistory(); operator = null; stored = null; fresh = true;
    message.textContent = 'Sonuç hazır. Yeni bir işlem yapabilirsin.';
  }
  function input(action, value) {
    if (failed && action !== 'clear') reset();
    if (action === 'digit') {
      if (fresh) { current = '0'; fresh = false; if (!operator) expression.textContent = '\u00a0'; }
      if (current.replace(/[-.]/g, '').length >= 12) { message.textContent = 'En fazla 12 basamak girebilirsin.'; render(); return; }
      current = current === '0' ? value : current === '-0' ? '-' + value : current + value;
      message.textContent = '';
    } else if (action === 'decimal') {
      if (fresh) { current = '0'; fresh = false; if (!operator) expression.textContent = '\u00a0'; }
      if (!current.includes('.') && !current.includes('e')) current += '.';
    } else if (action === 'operator') {
      if (operator && !fresh) calculate();
      if (!failed) { stored = Number(current); operator = value; fresh = true; expression.textContent = `${format(current)} ${symbols[value]}`; }
    } else if (action === 'equals') calculate();
    else if (action === 'clear') reset();
    else if (action === 'delete') {
      if (!fresh) { current = current.slice(0, -1); if (!current || current === '-') current = '0'; }
    } else if (action === 'sign') {
      current = current.startsWith('-') ? current.slice(1) : current === '0' ? '0' : '-' + current;
      if (fresh && operator) fresh = false;
    } else if (action === 'percent') {
      current = String(Number((Number(current) / 100).toPrecision(12)));
      if (fresh && operator) fresh = false;
      message.textContent = 'Yüzde: sayı 100’e bölündü.';
    }
    render();
  }
  document.querySelector('.keys').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.digit !== undefined) input('digit', button.dataset.digit);
    else if (button.dataset.operator) input('operator', button.dataset.operator);
    else input(button.dataset.action);
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    let action, value;
    if (/^[0-9]$/.test(event.key)) { action = 'digit'; value = event.key; }
    else if (Object.hasOwn(symbols, event.key)) { action = 'operator'; value = event.key; }
    else action = { Enter: 'equals', '=': 'equals', Escape: 'clear', Backspace: 'delete', Delete: 'clear', '.': 'decimal', ',': 'decimal', '%': 'percent' }[event.key];
    if (!action) return;
    if (event.key === 'Enter' && event.target.closest('button')) return;
    event.preventDefault(); input(action, value);
  });
  document.querySelector('#clear-history').addEventListener('click', () => { history = []; saveHistory(); renderHistory(); });
  render(); renderHistory();
})();

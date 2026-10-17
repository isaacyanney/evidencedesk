'use strict';
let apiKey = '';
let latest = null;
const $ = id => document.getElementById(id);
function node(tag, text, className) { const e = document.createElement(tag); if(text !== undefined) e.textContent = text; if(className) e.className = className; return e; }
async function api(path, options = {}) {
  const response = await fetch(path, {...options, headers: {'Content-Type':'application/json', ...(apiKey ? {'X-API-Key':apiKey}:{}), ...(options.headers || {})}});
  if (!response.ok) {
    let detail = 'Request failed';
    try { const data = await response.json(); detail = typeof data.detail === 'string' ? data.detail : 'Please check the question and try again.'; } catch { /* use generic error */ }
    throw new Error(`${response.status}: ${detail}`);
  }
  return response.json();
}
function error(message) { $('error').textContent = message; $('error').hidden = false; }
async function refresh() {
  try {
    const ready = await api('/health/ready');
    $('connection').textContent = ready.status === 'ready' ? 'Service ready' : 'Unavailable';
    document.querySelector('.connection').classList.toggle('ready', ready.status === 'ready');
    $('backend').textContent = ready.backend === 'hybrid' ? 'Neural + lexical' : 'Lexical baseline';
    const [corpus, stats] = await Promise.all([api('/api/corpus'), api('/api/stats')]);
    $('document-count').textContent = corpus.documents.length;
    $('request-count').textContent = stats.requests;
    $('stats').textContent = JSON.stringify(stats, null, 2);
    $('corpus-version').textContent = `Snapshot SHA-256: ${corpus.version}`;
    $('documents').replaceChildren();
    corpus.documents.forEach(doc => {
      const card = node('article', undefined, 'document card');
      card.append(node('h3', doc.title), node('p', `${doc.language.toUpperCase()} · ${doc.sections} sections · ${doc.document}`), node('div', doc.source_hash, 'mono'));
      $('documents').append(card);
    });
  } catch (e) { error(e.message); }
}
function render(data) {
  latest = data;
  const result = $('result'); result.replaceChildren(); result.hidden = false;
  const card = node('article', undefined, 'result card');
  const top = node('div', undefined, 'result-top');
  const labels = {answer:'Evidence found', escalate:'Escalate · evidence gap', blocked:'Request blocked'};
  top.append(node('span', labels[data.decision], `status ${data.decision}`), node('span', `${Math.round(data.latency_ms)} ms · ${data.generator}`));
  card.append(top, node('div', data.answer, 'answer-text'));
  const cited = new Set(data.citations);
  const meta = node('div', `Mode: ${data.backend}. ${data.score_note}${data.fallback ? ' Model drafting was unavailable or invalid; showing a source extract.' : ''}`, 'result-meta');
  card.append(meta);
  if (data.evidence.length) {
    const details = node('details', undefined, 'evidence');
    details.open = true;
    details.append(node('summary', `${data.citations.length} cited source(s) · ${data.evidence.length} retrieved sections`));
    data.evidence.forEach(hit => {
      const section = node('div', undefined, 'source');
      section.append(node('h4', `${cited.has(hit.id) ? 'CITED · ' : ''}${hit.title} / ${hit.section}`));
      section.append(node('div', `lexical ${hit.lexical_score.toFixed(3)}${hit.semantic_score === null ? '' : ' · semantic '+hit.semantic_score.toFixed(3)} · ${hit.language.toUpperCase()}`, 'mono'));
      section.append(node('p', hit.text), node('div', `${hit.document} · source ${hit.source_hash.slice(0,16)} · citation ${hit.id}`, 'mono'));
      details.append(section);
    });
    card.append(details);
  }
  card.append(node('div', `Request ${data.request_id} · snapshot ${data.corpus_version.slice(0,16)}`, 'result-meta mono'));
  const feedback = node('div', undefined, 'feedback'); feedback.append(node('span', 'Was this useful?'));
  for (const [label, helpful, reason] of [['Yes',true,'useful'],['No',false,'other']]) {
    const button = node('button', label); button.type = 'button';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await api('/api/feedback',{method:'POST',body:JSON.stringify({request_id:data.request_id,helpful,reason})}); feedback.replaceChildren(node('span','Feedback recorded. Thank you.')); }
      catch(e) { button.disabled = false; error(e.message); }
    }); feedback.append(button);
  }
  card.append(feedback); result.append(card);
}
$('query-form').addEventListener('submit', async event => {
  event.preventDefault(); if ($('ask').disabled) return; document.querySelectorAll('[data-question]').forEach(b=>b.disabled=true); $('error').hidden = true; $('ask').disabled = true; $('ask').textContent = 'Searching evidence…';
  const source_language = $('language').value;
  try { const result = await api('/api/query',{method:'POST',body:JSON.stringify({question:$('question').value,language:source_language === 'de' ? 'de':'en',source_language})}); render(result); await refresh(); }
  catch(e) { error(e.message); }
  finally { document.querySelectorAll('[data-question]').forEach(b=>b.disabled=false); $('ask').disabled = false; $('ask').replaceChildren(document.createTextNode('Find an answer '),node('span','↗')); }
});
document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
  $('question').value = button.dataset.question; $('language').value = button.dataset.lang; $('query-form').requestSubmit();
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.view').forEach(view => view.hidden = view.id !== button.dataset.view);
  document.querySelectorAll('[data-view]').forEach(nav => nav.classList.toggle('active', nav === button));
  $('view-title').textContent = button.textContent.trim().replace(/^[^A-Za-z]+/, '');
}));
$('connect').addEventListener('click', () => { apiKey = $('api-key').value; $('api-key').value = ''; $('error').hidden = true; refresh(); });
$('refresh').addEventListener('click',refresh);
refresh();

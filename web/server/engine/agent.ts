import type { Page } from 'playwright-core';
import { AgentRun, Scan, Utterance, emit, evidence, newId, persist } from './store.js';
import { newContext, gotoSafe, shot } from './scan.js';
import { chatJson, llmAvailable } from '../lib/llm.js';
import { recompute } from './scan.js';

type Decision = { thought: string; speak: string; action: 'activate' | 'type' | 'done' | 'give_up'; id?: string; text?: string };

const STOP = new Set(['the', 'a', 'an', 'to', 'and', 'of', 'for', 'in', 'on', 'my', 'it', 'then', 'with', 'go', 'add', 'find', 'buy', 'out']);

function observe(items: Utterance[], heard: string[]) {
  // What a screen-reader user can actually perceive: roles + accessible names. Mouse-only controls are
  // read as plain text (and are not operable via keyboard); silent ones do not exist at all.
  const lines: string[] = [];
  for (const u of items) {
    if (u.role === 'generic-clickable') { if (u.name) lines.push(`(text) ${u.name}`); continue; }
    if (u.role === 'text') { lines.push(`(text) ${u.speech.slice(0, 120)}`); continue; }
    if (u.role === 'landmark' || u.role === 'list') { lines.push(`— ${u.speech} —`); continue; }
    lines.push(`[${u.id}] ${u.speech}`);
  }
  let s = lines.slice(0, 220).join('\n');
  if (heard.length) s += `\n\nANNOUNCED SINCE LAST ACTION: ${heard.join(' | ')}`;
  return s;
}

const SAMPLE: [RegExp, string][] = [
  [/e-?mail/i, 'ada.lovelace@example.com'], [/full name|^name|your name/i, 'Ada Lovelace'], [/first/i, 'Ada'], [/last/i, 'Lovelace'],
  [/address|street/i, '1 Embarcadero, San Francisco, CA'], [/city/i, 'San Francisco'], [/zip|postal/i, '94111'], [/card/i, '4242 4242 4242 4242'],
  [/phone/i, '415-555-0100'], [/search/i, 'raincoat'],
];

function heuristic(goal: string, items: Utterance[], prev: { id?: string; name?: string; action: string }[], heard: string[]): Decision {
  const g = goal.toLowerCase();
  const words = g.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const allHeard = heard.join(' ');
  if (/order placed|thank you for your order|order confirmed|thanks for subscribing/i.test(allHeard))
    return { thought: 'The screen reader announced a confirmation.', speak: `I heard: “${allHeard.slice(0, 80)}”. Task complete.`, action: 'done' };
  const controls = items.filter((u) => ['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox'].includes(u.role) && u.name);
  const did = (re: RegExp) => prev.some((p) => p.action === 'activate' && p.name && re.test(p.name));
  const typed = new Set(prev.filter((p) => p.action === 'type').map((p) => p.id));
  const overlap = (c: Utterance) => words.filter((w) => c.name.toLowerCase().includes(w)).length;
  const pick = (re: RegExp) => controls.filter((c) => re.test(c.name) && ['button', 'link'].includes(c.role)).sort((a, b) => overlap(b) - overlap(a))[0];

  const shopping = /cart|checkout|buy|order|purchase/.test(g);
  if (shopping) {
    if (!did(/add .*to (cart|bag)|add to (cart|bag)/i)) {
      const c = pick(/add .*to (cart|bag)|add to (cart|bag)|^add\b/i);
      if (c) return { thought: `I hear “${c.speech}”. That matches the product in my goal.`, speak: `I hear “${c.name}”. Pressing it.`, action: 'activate', id: c.id };
    } else if (!did(/checkout|check out/i)) {
      const co = pick(/checkout|check out/i);
      if (co) return { thought: `I hear “${co.speech}”.`, speak: `Found “${co.name}”. Going to checkout.`, action: 'activate', id: co.id };
      const CART = /^(view |open |your )?(shopping )?(cart|bag|basket)\b/i;
      if (!did(CART)) {
        const c = pick(CART);
        if (c) return { thought: `Now I need the cart. I hear “${c.speech}”.`, speak: `Opening “${c.name}”.`, action: 'activate', id: c.id };
      }
    }
    if (did(/checkout|check out/i)) {
      const field = controls.find((c) => ['textbox', 'searchbox'].includes(c.role) && !typed.has(c.id) && SAMPLE.some(([re]) => re.test(c.name)) && !/search|chat|message|newsletter|subscribe/i.test(c.name));
      if (field) {
        const v = SAMPLE.find(([re]) => re.test(field.name))![1];
        return { thought: `The form asks for “${field.name}”.`, speak: `Filling in “${field.name}”.`, action: 'type', id: field.id, text: v };
      }
      const c = pick(/place order|pay now|complete (order|purchase)|submit order|buy now/i);
      if (c && !did(/place order|pay now|complete|submit order|buy now/i)) return { thought: `I hear “${c.speech}”.`, speak: `Pressing “${c.name}”.`, action: 'activate', id: c.id };
    }
  } else {
    const c = controls.filter((x) => ['button', 'link'].includes(x.role) && !prev.some((p) => p.id === x.id)).sort((a, b) => overlap(b) - overlap(a))[0];
    if (c && overlap(c) > 0) return { thought: `“${c.name}” matches my goal.`, speak: `I hear “${c.name}”. Activating it.`, action: 'activate', id: c.id };
    if (prev.length && overlap({ name: items.filter((u) => u.role === 'heading').map((u) => u.name).join(' ') } as Utterance) > 0)
      return { thought: 'The page heading now matches my goal.', speak: 'The heading confirms I reached the right place. Done.', action: 'done' };
  }

  const textHits = items.filter((u) => (u.role === 'text' || u.role === 'generic-clickable') && /add to cart|cart|checkout|place order/i.test(u.name));
  const silentCount = items.filter((u) => u.role === 'generic-clickable' && !u.name).length;
  const unnamed = items.filter((u) => u.issues.includes('no-name')).length;
  let reason = `I've listened to all ${items.length} announcements and I can't find a control for the next step.`;
  if (textHits.length) reason = `I hear “${textHits[0].name}”, but it's read as plain text, not a button. I can't press it.`;
  if (silentCount) reason += ` ${silentCount} controls make no sound at all, so for me they don't exist.`;
  else if (unnamed) reason += ` ${unnamed} buttons just say “button”, so I can't tell what they do.`;
  if (prev.some((p) => p.action === 'activate') && !heard.length) reason += ' Nothing was announced after my last action, so I can\'t tell whether it worked.';
  return { thought: reason, speak: reason, action: 'give_up' };
}

async function llmDecide(goal: string, obs: string, history: string[]): Promise<Decision | null> {
  return chatJson<Decision>(
    `You are Foghorn's blind test agent. You are completely blind and you navigate websites only with a screen reader, exactly like a real blind user using NVDA or VoiceOver.
You perceive ONLY the screen-reader output below. Lines marked [id] are controls you can activate or type into. Lines marked (text) are plain text: you can hear them but you CANNOT activate them. Silent controls do not appear at all. You never guess about the visual layout.
Choose ONE action per turn as JSON: {"thought": "your private reasoning, 1-2 sentences", "speak": "what you say out loud to the audience, first person, <= 25 words, vivid and honest about what you hear", "action": "activate" | "type" | "done" | "give_up", "id": "control id for activate/type", "text": "text to type"}.
Use "done" only when the announcements confirm the goal is complete. Use "give_up" when the controls you need are missing, unnamed or not operable. Explain exactly which barrier blocked you.`,
    `GOAL: ${goal}\n\nACTIONS SO FAR:\n${history.join('\n') || '(none)'}\n\nSCREEN READER OUTPUT (reading order):\n${obs}`,
    { maxTokens: 400 },
  );
}

export async function runBlindAgent(scan: Scan, goal: string, opts: { patch?: string; maxSteps?: number } = {}) {
  const run: AgentRun = { id: newId('run'), goal, mode: 'screen-reader', patched: !!opts.patch, status: 'running', steps: [], verdict: '', brain: llmAvailable() ? 'LLM via NY Token Exchange' : 'heuristic policy (offline)' };
  scan.agentRuns.push(run);
  emit(scan.id, { type: 'agent.start', run: { id: run.id, goal, patched: run.patched, brain: run.brain } });
  evidence(scan, 'agent.start', { run: run.id, goal, patched: run.patched, brain: run.brain });
  const ctx = await newContext(opts.patch);
  const page: Page = await ctx.newPage();
  const history: string[] = [];
  const max = opts.maxSteps ?? 9;
  try {
    await gotoSafe(page, scan.url);
    for (let n = 1; n <= max; n++) {
      const items = (await page.evaluate('window.__fh.walk({limit: 260})')) as Utterance[];
      const heard = (await page.evaluate('window.__fh.liveDrain()')) as string[];
      const obs = observe(items, heard);
      let d = llmAvailable() ? await llmDecide(goal, obs, history) : null;
      if (!d || !d.action) d = heuristic(goal, items, run.steps.map((s) => ({ id: s.targetId, name: s.targetName, action: s.action })), [...run.steps.flatMap((s) => s.heard || []), ...heard].slice(-4));
      const target = d.id ? items.find((u) => u.id === String(d!.id)) : undefined;
      const step = { n, thought: d.thought, speak: d.speak, action: d.action, targetId: d.id ? String(d.id) : undefined, targetName: target?.name, text: d.text, heard, shot: '', ok: true };
      if (d.action === 'activate' || d.action === 'type') {
        const handle = await page.$(`[data-fh-id="${d.id}"]`);
        if (!handle) { step.ok = false; step.speak = step.speak || 'That control vanished.'; }
        else {
          await handle.scrollIntoViewIfNeeded().catch(() => {});
          if (d.action === 'type') { await handle.fill(d.text || '').catch(async () => { await handle.focus(); await page.keyboard.type(d!.text || ''); }); }
          else {
            // Screen readers activate the focused control with Enter/Space (keyboard semantics), not a mouse click.
            await handle.focus().catch(() => {});
            const isFocused = await page.evaluate(`document.activeElement && document.activeElement.dataset.fhId === ${JSON.stringify(String(d.id))}`);
            if (isFocused) await page.keyboard.press('Enter');
            else await handle.click({ timeout: 2000 }).catch(() => { step.ok = false; });
          }
          await page.waitForTimeout(700);
        }
        history.push(`${n}. ${d.action} [${d.id}] ${target?.speech || ''}${d.text ? ` with "${d.text}"` : ''}`);
      }
      step.shot = await shot(page, scan.id, `${run.id}-${n}`);
      run.steps.push(step);
      emit(scan.id, { type: 'agent.step', runId: run.id, step });
      evidence(scan, 'agent.step', { run: run.id, n, action: d.action, target: target?.speech, heard });
      if (d.action === 'done') { run.status = 'success'; run.verdict = d.speak || 'Task completed.'; break; }
      if (d.action === 'give_up') { run.status = 'failed'; run.verdict = d.speak || d.thought; break; }
    }
    if (run.status === 'running') { run.status = 'failed'; run.verdict = `Ran out of steps after ${max} actions without completing the task.`; }
  } catch (e) {
    run.status = 'failed';
    run.verdict = `Agent error: ${(e as Error).message.slice(0, 160)}`;
  } finally {
    await ctx.close().catch(() => {});
  }
  emit(scan.id, { type: 'agent.done', runId: run.id, status: run.status, verdict: run.verdict });
  evidence(scan, 'agent.done', { run: run.id, status: run.status, verdict: run.verdict });
  recompute(scan);
  emit(scan.id, { type: 'rescore', score: scan.score, grade: scan.grade, risk: scan.risk });
  persist();
  return run;
}

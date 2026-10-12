/* =========================================================
   PostCraft · AI LinkedIn Content Creator
   Vanilla JS. Talks to the Spring Boot backend.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Configuration ---------- */
  const API_BASE_URL = '';
  const ENDPOINT = `${API_BASE_URL}/api/linkedin/generate`;
  const REQUEST_TIMEOUT_MS = 60000; // AI calls can be slow
  const MAX_ACHIEVEMENT = 500;
  const MAX_SKILLS = 10;
  const POST_LIMIT = 3000; // LinkedIn's post character limit

  /* ---------- DOM references ---------- */
  const $ = (id) => document.getElementById(id);
  const form = $('postForm');
  const achievementEl = $('achievement');
  const toneEl = $('tone');
  const skillInput = $('skillInput');
  const chipBox = $('chipBox');
  const generateBtn = $('generateBtn');
  const clearBtn = $('clearBtn');
  const copyBtn = $('copyBtn');
  const postContent = $('postContent');
  const postEmpty = $('postEmpty');
  const postCount = $('postCount');
  const tagsEl = $('hashtags');
  const tagsEmpty = $('tagsEmpty');
  const tipsEl = $('tips');
  const tipsEmpty = $('tipsEmpty');

  /** Current list of skills (source of truth for the chip UI). */
  let skills = [];

  /* ---------- Toasts ---------- */
  function showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    $('toasts').appendChild(toast);
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ---------- Character counters ---------- */
  function updateAchievementCount() {
    const len = achievementEl.value.length;
    const counter = $('achievementCount');
    counter.textContent = `${len} / ${MAX_ACHIEVEMENT}`;
    counter.classList.toggle('warn', len >= MAX_ACHIEVEMENT * 0.9);
  }

  function updatePostCount(text) {
    postCount.textContent = `${text.length} / ${POST_LIMIT}`;
    postCount.classList.toggle('warn', text.length > POST_LIMIT);
  }

  /* ---------- Skills chips ---------- */
  function renderSkills() {
    chipBox.querySelectorAll('.chip').forEach((c) => c.remove());
    skills.forEach((skill, i) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = skill;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${skill}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        skills.splice(i, 1);
        renderSkills();
      });
      chip.appendChild(remove);
      chipBox.insertBefore(chip, skillInput);
    });
    $('skillCount').textContent = `${skills.length} / ${MAX_SKILLS}`;
  }

  /** Add one or more skills from raw text; ignores blanks and duplicates. */
  function addSkills(raw) {
    raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((skill) => {
      if (skills.length >= MAX_SKILLS) {
        showToast(`You can add up to ${MAX_SKILLS} skills.`, 'error');
        return;
      }
      if (!skills.some((s) => s.toLowerCase() === skill.toLowerCase())) skills.push(skill);
    });
    renderSkills();
  }

  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkills(skillInput.value);
      skillInput.value = '';
    } else if (e.key === 'Backspace' && !skillInput.value && skills.length) {
      skills.pop(); // remove last chip
      renderSkills();
    }
  });
  skillInput.addEventListener('blur', () => { // keep text typed but not confirmed
    if (skillInput.value.trim()) { addSkills(skillInput.value); skillInput.value = ''; }
  });
  chipBox.addEventListener('click', () => skillInput.focus());
  achievementEl.addEventListener('input', () => { updateAchievementCount(); clearError('achievement'); });

  /* ---------- Validation ---------- */
  function setError(field, message) {
    const id = field === 'achievement' ? 'achievementError' : 'skillsError';
    $(id).textContent = message;
    (field === 'achievement' ? achievementEl : chipBox).closest('.field').classList.add('invalid');
  }
  function clearError(field) {
    const id = field === 'achievement' ? 'achievementError' : 'skillsError';
    $(id).textContent = '';
    (field === 'achievement' ? achievementEl : chipBox).closest('.field').classList.remove('invalid');
  }

  function validate() {
    clearError('achievement');
    clearError('skills');
    let valid = true;
    const text = achievementEl.value.trim();

    if (text.length < 5) {
      setError('achievement', 'Describe your achievement in at least 5 characters.');
      valid = false;
    }
    if (skills.length === 0) {
      setError('skills', 'Add at least one skill.');
      valid = false;
    }
    return valid;
  }
  skillInput.addEventListener('input', () => clearError('skills'));

  /* ---------- Loading state ---------- */
  function setLoading(isLoading) {
    generateBtn.classList.toggle('loading', isLoading);
    generateBtn.disabled = isLoading;
    generateBtn.querySelector('.btn-label').textContent = isLoading ? 'Generating…' : 'Generate post';
    form.setAttribute('aria-busy', String(isLoading));
  }

  /* ---------- API call ---------- */
  async function generatePost(payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Try to surface a server-provided message, fall back to status text
        let detail = '';
        try { detail = (await response.json()).message || ''; } catch (_) { /* body not JSON */ }
        throw new Error(detail || `Server responded with ${response.status} ${response.statusText}`.trim());
      }
      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('The request timed out. Please try again.');
      if (err instanceof TypeError) {
        throw new Error('Cannot reach the server. Check that the backend is running on localhost:9090 and CORS is enabled.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------- Render response ---------- */
  function renderResult(data) {
    const content = (data.content || '').trim();
    if (!content) throw new Error('The server returned an empty post.');

    // Post
    postContent.textContent = content; // textContent prevents HTML injection
    postContent.hidden = false;
    postCount.hidden = false;
    postEmpty.hidden = true;
    copyBtn.disabled = false;
    updatePostCount(content);

    // Hashtags: accept a space-separated string or an array
    const tags = (Array.isArray(data.hashtags) ? data.hashtags : String(data.hashtags || '').split(/\s+/)).filter(Boolean);
    tagsEl.replaceChildren(...tags.map((t) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t.startsWith('#') ? t : `#${t}`;
      return span;
    }));
    tagsEmpty.hidden = tags.length > 0;

    // Tips: accept a string (split by line or sentence) or an array
    const rawTips = Array.isArray(data.engagementTips)
      ? data.engagementTips
      : String(data.engagementTips || '').split(/\n+|(?<=[.!?])\s+(?=[A-Z])/);
    const tips = rawTips.map((t) => String(t).replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean);
    tipsEl.replaceChildren(...tips.map((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      return li;
    }));
    tipsEmpty.hidden = tips.length > 0;
  }

  function resetResults() {
    postContent.hidden = true;
    postCount.hidden = true;
    postEmpty.hidden = false;
    copyBtn.disabled = true;
    tagsEl.replaceChildren();
    tipsEl.replaceChildren();
    tagsEmpty.hidden = false;
    tipsEmpty.hidden = false;
  }

  /* ---------- Form submit ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    const payload = {
      achievement: achievementEl.value.trim(),
      tone: toneEl.value,
      skills: [...skills],
    };

    setLoading(true);
    try {
      const data = await generatePost(payload);
      renderResult(data);
      showToast('Post generated.');
      if (window.matchMedia('(max-width: 900px)').matches) {
        postContent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error', 5500);
    } finally {
      setLoading(false);
    }
  });

  /* ---------- Copy to clipboard ---------- */
  copyBtn.addEventListener('click', async () => {
    const text = postContent.textContent;
    const tags = [...tagsEl.children].map((t) => t.textContent).join(' ');
    const full = tags ? `${text}\n\n${tags}` : text; // include hashtags in the copied post

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(full);
      } else {
        // Fallback for non-secure contexts or older browsers
        const ta = document.createElement('textarea');
        ta.value = full;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (!ok) throw new Error('copy failed');
      }
      showToast('Post copied to clipboard.');
    } catch (_) {
      showToast('Could not copy. Select the text and copy it manually.', 'error');
    }
  });

  /* ---------- Clear form ---------- */
  clearBtn.addEventListener('click', () => {
    form.reset();
    skills = [];
    skillInput.value = '';
    renderSkills();
    updateAchievementCount();
    clearError('achievement');
    clearError('skills');
    resetResults();
    showToast('Form cleared.');
    achievementEl.focus();
  });

  /* ---------- Init ---------- */
  $('year').textContent = new Date().getFullYear();
  updateAchievementCount();
  renderSkills();
})();
(function () {
  'use strict';

  var root = document.documentElement,
      mark = document.querySelector('.mark'),
      parts = [].slice.call(document.querySelectorAll('[data-part]')),
      skip = document.getElementById('skip'),
      calm = matchMedia('(prefers-reduced-motion: reduce)').matches,
      timers = [],
      split = false;


  /* ------------------------------------------------- centre the halves -- */

  /* em sits left of centre and studio right of it while they still read as
     one word, so each needs its own sideways nudge to end up centred on its
     own line. offsetLeft ignores transforms, so this stays correct after the
     split and can be recomputed on any resize. */
  function place() {
    var half = mark.clientWidth / 2;
    parts.forEach(function (p) {
      var dx = half - (p.offsetLeft + p.offsetWidth / 2);
      p.style.setProperty('--dx', dx.toFixed(1) + 'px');
    });
    // the whole word's width, for docking it at the top left on Studio
    var last = parts[parts.length - 1];
    root.style.setProperty('--logo-w', (last.offsetLeft + last.offsetWidth - parts[0].offsetLeft) + 'px');
  }

  place();
  addEventListener('resize', place);
  addEventListener('load', place);   // font swap can change the metrics


  /* ------------------------------------------------------------ pages -- */

  /* Studio, Lavori and Contatti are three views chosen by the URL hash
     (Studio when there is none). Changing page replays the opening: the logo
     comes back to the middle as "em studio", the view is swapped while it
     covers the screen, then it settles again: whole at the top on Studio,
     parted into em and studio on the others. */
  var views = [].slice.call(document.querySelectorAll('.view')),
      links = [].slice.call(document.querySelectorAll('.corner--tr a')),
      active = null, swap = 0;

  function target() {
    var id = location.hash.slice(1);
    return views.filter(function (v) { return v.id === id; })[0] || views[0];
  }

  function current(v) {
    var href = v.id === 'studio' ? '#home' : '#' + v.id;
    links.forEach(function (a) {
      if (a.getAttribute('href') === href) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // move a page's scroll without the smooth glide the CSS asks for
  function jump(el, top) {
    el.style.scrollBehavior = 'auto';
    el.scrollTop = top;
    el.style.scrollBehavior = '';
  }

  // the projects have their own page now: an old #lavori link goes there
  function land(glide) {
    if (location.hash === '#lavori') location.replace('lavori.html');
    else if (glide) studio.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function show(v) {
    if (v.id === 'contatti') wear('navy');
    if (v.id === 'chi-siamo') wear('paper');
    rewatch(v);
    views.forEach(function (x) { x.classList.toggle('is-active', x === v); });
    current(v);
    root.classList.toggle('on-contatti', v.id === 'contatti');
    root.classList.toggle('on-chi', v.id === 'chi-siamo');
    root.classList.toggle('on-studio', v.id === 'studio');
    jump(v, 0);
    if (v.id === 'studio') size();
    else showcaseAt(studio.scrollTop);   // left from inside the showcase: its state (and wheel) goes with it
  }

  // every page wears the logo small in the top left corner
  function settle(v) {
    root.classList.add('is-top');
  }

  // the colour a page opens in, and the logo's tone on it
  function dress(v) {
    return SCENES[v === studio ? sceneEls[0].getAttribute('data-scene') : v.id === 'contatti' ? 'navy' : 'paper'];
  }

  /* The next page's colour falls over the screen like a curtain, under the
     logo in the middle; the logo turns to its tone as the curtain passes it.
     The curtain stays down until the page under it is swapped. */
  var FALL = 1700, curtain = null;
  function fall(sc) {
    if (curtain) curtain.remove();
    curtain = document.body.appendChild(document.createElement('div'));
    curtain.className = 'curtain';
    curtain.style.background = sc[0];
    if (calm) return setTone(sc[1]);
    curtain.animate([{ transform: 'translateY(-100%)' }, { transform: 'none' }],
                    { duration: FALL, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
    // the menu turns as the curtain's edge reaches it (the ease is about 4t³ at the start)
    var reach = Math.min(0.5, (document.querySelector('.corner--tr').getBoundingClientRect().bottom + 6) / innerHeight);
    setTimeout(function () { root.setAttribute('data-menu', sc[1]); }, FALL * Math.cbrt(reach / 4));
    setTimeout(function () { setTone(sc[1]); }, FALL * 0.5);
  }
  function lift() {
    if (curtain) { curtain.remove(); curtain = null; }
    root.removeAttribute('data-menu');   // the page's own tone takes the menu back
  }

  function go() {
    var v = target();
    if (v === active) { current(v); if (v === studio) land(true); return; }
    var first = !active;
    active = v;
    if (!split || first) { show(v); land(false); return; }   // the opening reveals it
    // the page fades, the logo comes back to the middle, then goes back up on the new page
    root.classList.remove('is-split', 'is-top', 'is-docked');
    clearTimeout(swap);
    fall(dress(v));
    swap = setTimeout(function () {
      show(v);
      lift();
      settle(v);
      land(false);
    }, calm ? 0 : FALL + 150);         // the curtain down, plus a beat
  }

  addEventListener('hashchange', go);

  /* Lavori is a page of its own. Rather than cut to it, close the logo back
     to the middle as on any change of page, turn the colour to its white, then
     go; the Lavori page is told (sessionStorage) to start from this logo. */
  [].forEach.call(document.querySelectorAll('a[href="lavori.html"]'), function (a) {
    a.addEventListener('click', function (e) {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // a new tab: just follow the link
      e.preventDefault();
      clearTimeout(swap);
      root.classList.remove('is-split', 'is-top', 'is-docked');
      fall(['#ffffff', 'light']);   // the Lavori page is white, with the logo in navy
      try { sessionStorage.setItem('em-from', 'home'); } catch (err) {}
      setTimeout(function () { document.body.style.backgroundColor = '#ffffff'; location.href = a.href; }, calm ? 0 : FALL + 100);
    });
  });
  // back from Lavori through the browser's history: open the page again
  addEventListener('pageshow', function (e) {
    if (!e.persisted || !active) return;
    lift();
    settle(active);
    if (active === studio) atmosphere(studio.scrollTop); else wear(active.id === 'chi-siamo' ? 'paper' : 'navy');
  });

  /* Studio's first part reads straight down: the slogan fills the first
     screen, and each block after it fades up as the scroll brings it in. */
  var studio = document.getElementById('studio'),
      steps = document.getElementById('steps'),
      stepEls = [].slice.call(steps.children);

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ------------------------------------------------------- colour -- */

  /* Studio's pages each have a colour of their own, so a boundary between
     two pages is a clean edge; the fixed things at the top (bar, logo, menu)
     change colour as the edge passes under the bar, so they always match the
     page beneath them. */
  var SCENES = {          // page colour, tone of the type and logo
    blue:  ['#334eac', 'dark'],
    lilac: ['#ffffff', 'light'],   // straight to white after the blue of the first part
    navy:  ['#091956', 'dark'],
    sand:  ['#eee5dc', 'light'],
    paper: ['#ffffff', 'light'],   // the services showcase
    sky:   ['#5783e4', 'dark']
  };

  var sceneEls = [].slice.call(document.querySelectorAll('#studio [data-scene]')),
      sceneTops = [], barH = 0, tone = '', bar = document.querySelector('.bar');
  sceneEls.forEach(function (el) { el.style.backgroundColor = SCENES[el.getAttribute('data-scene')][0]; });

  function setTone(t) {
    if (t === tone) return;
    tone = t;
    root.setAttribute('data-tone', t);
  }

  var base = '';
  function setBase(c) {
    if (c === base) return;   // a new --scene restyles the whole page, so only when it changes
    base = c;
    root.style.setProperty('--scene', c);
    document.body.style.backgroundColor = c;
  }

  // a page outside Studio (Contatti) simply wears its colour
  function wear(name) { setBase(SCENES[name][0]); setTone(SCENES[name][1]); }

  function atmosphere(y) {
    if (active !== studio) return;
    var under = y + barH / 2, j = 1;
    for (; j < sceneEls.length && sceneTops[j] <= under; j++);
    var sc = SCENES[sceneEls[j - 1].getAttribute('data-scene')];
    setBase(sc[0]);
    setTone(sc[1]);
  }

  // where an element sits inside a scroller (positioned ancestors become offset parents)
  function offsetIn(el, ref) {
    var x = 0, y = 0;
    for (; el && el !== ref; el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop; }
    return [x, y];
  }

  /* Everything the scroll needs is measured here, on load and resize, so a
     scroll event only reads scrollTop and never makes the page lay out. */
  var scTop = 0, scN = 1, scH = 0, viewH = 0;
  function size() {
    sceneTops = sceneEls.map(function (el) { return el.offsetTop; });
    barH = bar.offsetHeight;
    viewH = studio.clientHeight;
    if (showcase) {
      scTop = offsetIn(showcase, studio)[1];
      scH = showcase.offsetHeight;
      scN = parseInt(getComputedStyle(showcase).getPropertyValue('--steps'), 10) || 1;
    }
    scrolled();
  }

  function scrolled() {
    var y = studio.scrollTop;
    atmosphere(y);
    // the bar comes in once the slogan has scrolled half off, so text never runs under a bare logo
    root.classList.toggle('is-docked', split && active === studio && y > viewH * 0.5);
    showcaseAt(y);
  }
  studio.addEventListener('scroll', scrolled, { passive: true });

  /* ---------------------------------------------- the services showcase -- */

  /* One step per screen of scroll through the showcase. Each rolling slot,
     text block and photo learns whether it is past, now or still to come;
     the CSS does the moving. */
  var showcase = document.getElementById('showcase'), scStep = -1;
  function showcaseAt(y) {
    if (!showcase) return;
    var top = scTop, h = viewH,
        i = clamp(Math.floor((y - top) / h + 0.5), 0, scN - 1);
    // while it is pinned nothing scrolls under the logo, so the frosted bar steps aside
    var on = active === studio && y > top - h * 0.5 && y < top + scH - h * 0.5;
    if (on !== root.classList.contains('on-showcase')) {
      root.classList.toggle('on-showcase', on);
      // the wheel is only taken over here: anywhere else the page scrolls without waiting on script
      if (on) studio.addEventListener('wheel', walk, { passive: false });
      else studio.removeEventListener('wheel', walk, { passive: false });
    }
    if (i === scStep) return;
    scStep = i;
    [].forEach.call(showcase.querySelectorAll('.roll, .sc-copy, .sc-right'), function (slot) {
      [].forEach.call(slot.children, function (el, k) {
        if (el.tagName === 'A') return;   // the card rides over the photos
        el.classList.toggle('is-past', k < i);
        el.classList.toggle('is-now', k === i);
      });
    });
    // its tagline and paragraph rise line by line, a beat after the name
    if (!calm) [].forEach.call(showcase.querySelectorAll('.sc-text.is-now p'), function (p, k) { rise(p, 0.15 + k * 0.15); });
  }

  /* Inside the showcase the wheel walks the photos. A single tick is too
     short for the snapping to carry on to the next stop (it would settle
     back where it was), and a hard flick is many ticks: so each tick is
     taken here and turned into one glide to the next stop, at most one every
     0.85s (a flick lasts less). Scrolling on and on walks through them, and
     out of either end (to the heading above, or the end of Home below), so
     the page is never held. A swipe is left to the browser's snapping. */
  var wheelHeld = false, homeEnd = document.querySelector('.home-end');
  function walk(e) {
    if (!root.classList.contains('on-showcase') || Math.abs(e.deltaY) < 1) return;
    e.preventDefault();
    if (wheelHeld) return;
    wheelHeld = true;
    setTimeout(function () { wheelHeld = false; }, 850);
    var top = scTop, h = viewH, n = scN,
        next = clamp(Math.round((studio.scrollTop - top) / h), 0, n - 1) + (e.deltaY > 0 ? 1 : -1),
        to;
    if (next < 0) to = offsetIn(showcase.previousElementSibling, studio)[1];                       // the heading above
    else if (next > n - 1) to = offsetIn(homeEnd, studio)[1] + homeEnd.offsetHeight - h;           // the end of Home
    else to = top + next * h;
    studio.scrollTo({ top: to, behavior: calm ? 'auto' : 'smooth' });
  }

  // the way out from any photo: straight on to the end of Home
  var skipBtn = document.getElementById('sc-skip');
  if (skipBtn && homeEnd) skipBtn.addEventListener('click', function () {
    var top = offsetIn(homeEnd, studio)[1] + homeEnd.offsetHeight - studio.clientHeight;
    studio.scrollTo({ top: top, behavior: calm ? 'auto' : 'smooth' });
  });


  /* ------------------------------------------------- the text rising -- */

  /* Every heading and paragraph on Home and Studio arrives the way the slogan does:
     line by line, each line rising out of its own mask, as the scroll brings
     it in. Plain text is cut into its real lines at that moment (so a late
     font or a resize cannot leave stale breaks); text with links or bold
     rises as one block. Once in, the element gets its own markup back. */
  var risers = calm || !('IntersectionObserver' in window) ? [] :
    [].slice.call(document.querySelectorAll('#studio h2, #studio h3, #studio p, #chi-siamo h2, #chi-siamo h3, #chi-siamo p'))
      .filter(function (el) { return !el.closest('.intro, .steps, .hint, .showcase') && el.textContent.trim(); });

  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function cut(el) {
    if (el.children.length) return ['<span class="rl"><span>' + el.innerHTML + '</span></span>'];
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="rw">' + esc(w) + '</span>'; }).join(' ');
    var rows = [], top = null;
    [].forEach.call(el.children, function (w) {
      if (w.offsetTop !== top) { rows.push([]); top = w.offsetTop; }
      rows[rows.length - 1].push(esc(w.textContent));
    });
    return rows.map(function (r) { return '<span class="rl"><span>' + r.join(' ') + '</span></span>'; });
  }

  function rise(el, delay) {
    // risen again before the last rise has finished: start from its own markup
    clearTimeout(el.riseT);
    if (el.riseFrom != null) el.innerHTML = el.riseFrom;
    var original = el.riseFrom = el.innerHTML, rows = cut(el);
    el.innerHTML = rows.join('');
    [].forEach.call(el.children, function (r, i) { r.firstChild.style.transitionDelay = (delay + i * 0.15).toFixed(2) + 's'; });
    el.classList.add('rv-on');
    el.getBoundingClientRect();   // commit the lowered lines before they rise
    el.classList.add('rv-in');
    el.riseT = setTimeout(function () {      // in place: hand the element its own markup back
      el.innerHTML = original;
      el.riseFrom = null;
      el.classList.remove('rv', 'rv-on', 'rv-in');
    }, (delay + rows.length * 0.15 + 1.7) * 1000);
  }

  /* Both pages sit on the screen at once (one hidden), so an element only
     rises while its own page is showing; when a page is shown, whatever is
     still waiting on it is looked at again. The flow's steps light up the
     same way. */
  var seen = null;
  function onShow(el) { return el.closest('.view') === active; }
  if (risers.length) {
    risers.forEach(function (el) { el.classList.add('rv'); });
    seen = new IntersectionObserver(function (es) {
      // what comes in together rises in reading order, a beat apart
      es.filter(function (e) { return e.isIntersecting && onShow(e.target); }).forEach(function (e, i) {
        seen.unobserve(e.target);
        if (e.target.tagName === 'LI') e.target.classList.add('on');
        else rise(e.target, i * 0.2);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    risers.forEach(function (el) { seen.observe(el); });
  }
  if (seen) stepEls.forEach(function (li) { seen.observe(li); });
  else stepEls.forEach(function (li) { li.classList.add('on'); });

  function rewatch(v) {
    if (!seen) return;
    risers.concat(stepEls).forEach(function (el) {
      if (el.closest('.view') !== v || (el.tagName === 'LI' ? el.classList.contains('on') : !el.classList.contains('rv'))) return;
      seen.unobserve(el);
      seen.observe(el);
    });
  }
  addEventListener('resize', size);
  addEventListener('load', size);
  // the web font and the pictures arrive late and change the heights: measure again when a section does
  if (window.ResizeObserver) {
    var again = 0;
    var ro = new ResizeObserver(function () { cancelAnimationFrame(again); again = requestAnimationFrame(size); });
    sceneEls.forEach(function (el) { ro.observe(el); });
  }
  size();


  // the logo takes Home and Studio back to their top, and Contatti to Home
  mark.addEventListener('click', function () {
    if (!split) return;
    if (active.id === 'contatti') location.hash = '#home';
    else {
      // the showcase's snapping would catch the glide on its way up: off until it is at the top
      var el = active, back = function () { el.style.scrollSnapType = ''; };
      el.style.scrollSnapType = 'none';
      el.addEventListener('scrollend', back, { once: true });
      setTimeout(back, 2500);   // where scrollend is not supported
      el.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    }
  });

  /* ------------------------------------------------------ the sequence -- */

  function open() {
    if (split) return;
    split = true;
    timers.forEach(clearTimeout);
    place();
    root.classList.add('is-grown');
    settle(active || target());
    setTimeout(photos, calm ? 0 : 1000);
  }

  /* The showcase's photos are far down the page: they load once the logo has
     settled, so decoding them never stutters the opening. */
  function photos() {
    [].forEach.call(document.querySelectorAll('img[data-src]'), function (im) {
      im.src = im.getAttribute('data-src');
      im.removeAttribute('data-src');
    });
  }

  // arriving from the Lavori page, whose last frame is this logo whole in the
  // middle: start from there instead of from nothing, and dock straight away
  var fromLavori = false;
  try { fromLavori = sessionStorage.getItem('em-from') === 'lavori'; sessionStorage.removeItem('em-from'); } catch (e) {}

  if (calm) {
    root.classList.add('is-grown');
    settle(target());
    split = true;
    photos();
  } else if (fromLavori) {
    // no transitions for the first frame: the logo must already be grown and
    // already in the page's tone, exactly as the Lavori page left it
    var still = [mark].concat([].slice.call(mark.querySelectorAll('img')));
    still.forEach(function (el) { el.style.transition = 'none'; });
    root.classList.add('is-grown');
    // the page and its tone are set further down (go), so wait for the first
    // frame, commit it, and only then give the transitions back
    requestAnimationFrame(function () {
      mark.getBoundingClientRect();
      still.forEach(function (el) { el.style.transition = ''; });
    });
    // to Contatti, the mirror of leaving it: the navy page fades in over the
    // whole logo, and the logo parts only once it is covered
    // the move already happened on the Lavori page, so no pause here: the logo
    // goes straight on, docking for Studio or parting (em up, studio down) for Contatti
    timers.push(setTimeout(open, 60));
  } else {
    // a beat of plain paper, the 1.35s zoom, then a short hold before it parts
    timers.push(setTimeout(function () { root.classList.add('is-grown'); }, 120));
    timers.push(setTimeout(open, 1650));

    skip.addEventListener('click', open);
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Enter') open();
    });
    // any attempt to scroll before the split just opens the page
    addEventListener('wheel', function first(e) {
      removeEventListener('wheel', first, { passive: false });   // once open, scrolling never waits on script
      if (!split) { e.preventDefault(); open(); }
    }, { passive: false });
  }


  go();


  /* ------------------------------------------------------ team: deal -- */

  /* The eight people in the markup are the pool; four are dealt, Emily
     always among them. Rimescola turns the cards over one after another and
     swaps each person at the moment the card is edge-on. */
  var people = document.getElementById('people'),
      slots = [].slice.call(people.children),
      pool = slots.map(function (li) { return li.innerHTML; }),
      dealing = false;

  slots.slice(4).forEach(function (li) { people.removeChild(li); });
  slots = slots.slice(0, 4);

  function pick() {
    var rest = pool.slice(1).sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    return [pool[0]].concat(rest).sort(function () { return Math.random() - 0.5; });
  }

  document.getElementById('shuffle').addEventListener('click', function () {
    if (dealing) return;
    var next = pick();
    if (calm) { slots.forEach(function (li, i) { li.innerHTML = next[i]; }); return; }
    dealing = true;
    slots.forEach(function (li, i) {
      setTimeout(function () {
        li.classList.add('is-out');
        setTimeout(function () {
          li.innerHTML = next[i];
          li.classList.remove('is-out');
          li.classList.add('is-in');
          setTimeout(function () {
            li.classList.remove('is-in');
            if (i === slots.length - 1) dealing = false;
          }, 450);
        }, 300);
      }, i * 110);
    });
  });


  /* ------------------------------------------------------------ form -- */

  // the quote form opens a pre-filled email, as on the landing page
  document.getElementById('quote').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(e.target);
    var body = 'Nome: ' + f.get('nome') + '\nEmail: ' + f.get('email') +
               '\nAzienda: ' + f.get('azienda') + '\nServizio: ' + f.get('servizio') +
               '\n\n' + f.get('msg');
    location.href = 'mailto:emstudio.work@gmail.com?subject=' +
      encodeURIComponent('Richiesta preventivo') + '&body=' + encodeURIComponent(body);
  });
})();

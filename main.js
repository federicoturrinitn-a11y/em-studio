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

  /* ------------------------------------------------------- colour -- */

  /* Studio's pages each have a colour of their own, so a boundary between
     two pages is a clean edge; the fixed things at the top (bar, logo, menu)
     change colour as the edge passes under the bar, so they always match the
     page beneath them. */
  var SCENES = {          // page colour, tone of the type and logo
    blue:  ['#091956', 'dark'],   // the first part: dark blue, like the services after it
    lilac: ['#ffffff', 'light'],   // straight to white after the blue of the first part
    navy:  ['#091956', 'dark'],
    sand:  ['#eee5dc', 'light'],
    paper: ['#ffffff', 'light'],
    sky:   ['#5783e4', 'dark']
  };

  var sceneEls = [].slice.call(document.querySelectorAll('#studio [data-scene]')),
      sceneTops = [], barH = 0, tone = '', bar = document.querySelector('.bar'),
      hero = document.querySelector('.hero'), heroEnd = 0;
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
  function wear(name) { setBase(SCENES[name][0]); setTone(SCENES[name][1]); barColour(''); }

  // the bar follows the blue-to-navy fade at the end of the first part (CSS
  // .hscroll::after, 60vh) instead of switching at the edge; only the bar is
  // restyled, --scene would restyle the whole page on every frame
  var barC = '';
  function barColour(c) { if (c !== barC) { barC = c; bar.style.backgroundColor = c; } }
  function hex(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function mix(a, b, t) {
    a = hex(a); b = hex(b);
    return 'rgba(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ',0.9)';
  }

  function atmosphere(y) {
    if (active !== studio) return;
    var under = y + barH / 2, j = 1;
    for (; j < sceneEls.length && sceneTops[j] <= under; j++);
    var cur = sceneEls[j - 1], sc = SCENES[cur.getAttribute('data-scene')], t = 0;
    if (cur.id === 'hscroll' && j < sceneEls.length)
      t = Math.min(1, Math.max(0, 1 - (sceneTops[j] - under) / (innerHeight * 0.6)));
    var nx = t > 0 && SCENES[sceneEls[j].getAttribute('data-scene')][0];
    barColour(t > 0 ? mix(sc[0], nx, t) : '');
    // in the fade the base is already navy: a fast scroll shows it where the page is not drawn yet
    setBase(nx || sc[0]);
    setTone(sc[1]);
  }

  /* Everything the scroll needs is measured here, on load and resize, so a
     scroll event only reads scrollTop and never makes the page lay out. */
  function size() {
    sceneTops = sceneEls.map(function (el) { return el.offsetTop; });
    barH = bar.offsetHeight;
    heroEnd = hero.offsetHeight - barH;
    scrolled();
  }

  function scrolled() {
    var y = studio.scrollTop;
    atmosphere(y);
    // the bar comes in once the photos of the first screen have gone under the logo: text must never run under a bare logo
    root.classList.toggle('is-docked', split && active === studio && y > heroEnd);
  }
  studio.addEventListener('scroll', scrolled, { passive: true });

  /* ------------------------------------------ the services' examples -- */

  /* Each service has a project as its example. Pointing at a row brings its
     photo up beside the name (CSS); opening the row moves that photo to its
     place beside the text, and the row to the middle of the screen; closing
     it takes the page back where it was before the first row was opened.
     On a phone none of this: rows open and close on their own (several can
     be open), so nothing moves under the finger. */
  var rows = [].slice.call(document.querySelectorAll('.svc details')),
      narrow = matchMedia('(max-width: 760px)'),   // as in the CSS: the services' phone layout
      pointer = matchMedia('(hover: hover)'),
      back = null;
  function glideTo(top) { studio.scrollTo({ top: top, behavior: calm ? 'auto' : 'smooth' }); }
  // the photo of an opened row starts where it floated beside the name and flies to its place
  function fly(d, from, tilt) {
    var pic = d.querySelector('.svc-pic'), to = pic.getBoundingClientRect();
    if (!to.width) return;
    pic.animate(from ? [
      { transform: 'translate(' + (from.x - to.left - to.width / 2) + 'px,' + (from.y - to.top - to.height / 2) + 'px) scale(' + from.w / to.width + ') rotate(' + tilt + ')' },
      { transform: 'none' }
    ] : [   // opened from the keyboard, nothing floating: it just comes up
      { opacity: 0, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 900, easing: 'cubic-bezier(0.45, 0, 0.15, 1)' });
  }
  function centre(i) {
    /* The rows are still opening and closing, so where this one will end up
       is added up from the closed heights of those above it (a summary and
       its rule), and its own height from its summary and text. */
    var top = rows[0].getBoundingClientRect().top + studio.scrollTop, k = 0;
    for (; k < i; k++) top += rows[k].firstElementChild.offsetHeight + 1;
    var h = rows[i].firstElementChild.offsetHeight + 1 + rows[i].lastElementChild.offsetHeight,
        free = studio.clientHeight - barH,
        to = top - barH - Math.max(0, (free - h) / 2);   // a row taller than the room starts at its top
    glideTo(to);
  }
  // rows that share a name close one another: only on a wide screen
  function share() { rows.forEach(function (d) { if (narrow.matches) d.removeAttribute('name'); else d.setAttribute('name', 'svc'); }); }
  share();
  narrow.addEventListener('change', share);
  rows.forEach(function (d, i) {
    var head = d.firstElementChild;
    head.addEventListener('click', function (e) {
      if (calm) return;
      // a row folds back before it closes (on its own the browser would just cut it off)
      if (d.open) {
        e.preventDefault();
        if (d.classList.contains('is-closing')) return;
        d.classList.add('is-closing');
        setTimeout(function () { d.open = false; d.classList.remove('is-closing'); }, 450);   // the fold's time in the CSS
        return;
      }
      if (narrow.matches) return;   // a phone: the CSS unfolds the row
      // where the photo floats now, read before the row opens (it fades once open)
      var fl = head.querySelector('.svc-float'), r = fl.getBoundingClientRect(),
          from = pointer.matches && head.matches(':hover') ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: fl.offsetWidth } : null,
          tilt = getComputedStyle(fl).getPropertyValue('--tilt').trim() || '0deg';
      // the browser opens the row after this click; the next frame, before it is drawn, starts the flight
      requestAnimationFrame(function () { fly(d, from, tilt); });
    });
    d.addEventListener('toggle', function () {
      if (narrow.matches) return;
      var at = rows.findIndex(function (r) { return r.open; });   // -1: all closed
      if (d.open) {
        if (back === null) back = studio.scrollTop;
        centre(i);
      } else if (at < 0) {
        if (back !== null) glideTo(back);
        back = null;
      }
    });
  });


  /* ------------------------------------------------- the text rising -- */

  /* Every heading and paragraph on Home and Studio arrives the way the slogan does:
     line by line, each line rising out of its own mask, as the scroll brings
     it in. Plain text is cut into its real lines at that moment (so a late
     font or a resize cannot leave stale breaks); text with links or bold
     rises as one block. Once in, the element gets its own markup back. */
  var risers = calm || !('IntersectionObserver' in window) ? [] :
    [].slice.call(document.querySelectorAll('#studio h2, #studio h3, #studio p, #chi-siamo h2, #chi-siamo h3, #chi-siamo p'))
      .filter(function (el) { return !el.closest('.intro, .steps, .hint, .svc') && el.textContent.trim(); });

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
    else active.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------ the sequence -- */

  function open() {
    if (split) return;
    split = true;
    timers.forEach(clearTimeout);
    place();
    root.classList.add('is-grown');
    settle(active || target());
    setTimeout(settled, calm ? 0 : 1000);
  }

  /* Once the logo has settled the services' photos (far down the page) load;
     decoding them during the opening made it stutter. */
  function settled() {
    [].forEach.call(document.querySelectorAll('img[data-src]'), function (im) {
      im.src = im.getAttribute('data-src');
      im.removeAttribute('data-src');
    });
  }

  // arriving from the Lavori page, whose last frame is this logo whole in the
  // middle: start from there instead of from nothing, and dock straight away
  var fromLavori = false;
  try { fromLavori = sessionStorage.getItem('em-from') === 'lavori'; sessionStorage.removeItem('em-from'); } catch (e) {}

  // the background first: its light fades in before anything else moves
  requestAnimationFrame(function () { root.classList.add('is-lit'); });
  // each sliding row of photos holds its set three times over, so it never runs out (CSS .mstrip)
  [].forEach.call(document.querySelectorAll('.mstrip'), function (s) { s.innerHTML += s.innerHTML + s.innerHTML; });
  // and it stops drifting while it is scrolled out of sight
  var glow = document.querySelector('.sticky');
  if (glow && window.IntersectionObserver) new IntersectionObserver(function (es) {
    glow.classList.toggle('is-away', !es[0].isIntersecting);
  }).observe(glow);

  if (calm) {
    root.classList.add('is-grown');
    settle(target());
    split = true;
    settled();
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

  /* The quote form opens a pre-filled email in the visitor's mail program.
     Where there is none (many computers) nothing would seem to happen, and
     the page cannot tell: so it always says what it did, and offers the
     message to copy into an email written by hand. */
  var done = document.getElementById('quote-done'), copy = done.querySelector('button'), written = '';
  document.getElementById('quote').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = new FormData(e.target);
    written = 'Nome: ' + f.get('nome') + '\nEmail: ' + f.get('email') +
              '\nAzienda: ' + f.get('azienda') + '\nServizio: ' + f.get('servizio') +
              '\n\n' + f.get('msg');
    done.hidden = false;
    copy.textContent = 'Copia il messaggio';
    location.href = 'mailto:emstudio.work@gmail.com?subject=' +
      encodeURIComponent('Richiesta preventivo') + '&body=' + encodeURIComponent(written);
  });
  // a service's "Contattaci" opens the form with that service already chosen
  [].forEach.call(document.querySelectorAll('.svc-cta'), function (a) {
    a.addEventListener('click', function () { document.getElementById('quote').servizio.value = a.getAttribute('data-svc'); });
  });
  if (!navigator.clipboard) copy.hidden = true;   // an old browser: the address is there to write to
  copy.addEventListener('click', function () {
    navigator.clipboard.writeText(written).then(
      function () { copy.textContent = 'Messaggio copiato'; },
      function () { copy.textContent = 'Copia non riuscita'; });   // the browser refused: the text is still in the form
  });
})();

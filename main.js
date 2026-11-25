(function () {
  'use strict';

  var root = document.documentElement,
      mark = document.querySelector('.mark'),
      parts = [].slice.call(document.querySelectorAll('[data-part]')),
      skip = document.getElementById('skip'),
      calm = matchMedia('(prefers-reduced-motion: reduce)').matches,
      timers = [],
      split = false,
      entering = !calm;   // Home's opening: the logo dark on white until the photos have covered it


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
    if (active === studio) scrolled(); else wear(active.id === 'chi-siamo' ? 'paper' : 'navy');
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
    blue:  ['#091956', 'dark'],   // the first part: dark blue under the white of the photos (CSS .hero)
    lilac: ['#ffffff', 'light'],   // straight to white after the blue of the first part
    navy:  ['#091956', 'dark'],
    sand:  ['#eee5dc', 'light'],
    paper: ['#ffffff', 'light'],
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
  function wear(name) { setBase(SCENES[name][0]); setTone(SCENES[name][1]); barColour(''); }

  var barC = '';
  function barColour(c) { if (c !== barC) { barC = c; bar.style.backgroundColor = c; } }

  // the logo and the menu wear the tone of the page under the bar; at the top of
  // Home (and in its opening) they are dark, on the white of the first screen
  function atmosphere(y) {
    if (active !== studio) return;
    var under = y + barH / 2, j = 1;
    for (; j < sceneEls.length && sceneTops[j] <= under; j++);
    var sc = SCENES[sceneEls[j - 1].getAttribute('data-scene')];
    barColour('');
    setBase(sc[0]);
    setTone(entering || y <= 8 ? 'light' : sc[1]);
  }

  /* Everything the scroll needs is measured here, on load and resize, so a
     scroll event only reads scrollTop and never makes the page lay out. */
  function size() {
    sceneTops = sceneEls.map(function (el) { return el.offsetTop; });
    barH = bar.offsetHeight;
    scrolled();
  }

  function scrolled() {
    var y = studio.scrollTop, home = split && active === studio;
    // at the very top of Home the logo parts around the phone; the first scroll docks it top left, over the bar
    if (!entering) root.classList.toggle('is-beside', home && y <= 8);
    atmosphere(y);
    root.classList.toggle('is-docked', home && y > 8);
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
  /* The photo of an opened row starts where it floated beside the name and
     flies to its place while the row unfolds. The row clips what is in it as
     it grows, so the flight is a copy laid over the row, outside that clip; the
     photo itself shows once the copy has landed. The copy is placed inside the
     row, so it moves with it when the page glides or a row above folds away. */
  function fly(d, from, tilt) {
    var pic = d.querySelector('.svc-body .svc-pic'), box = d.getBoundingClientRect(), to = pic.getBoundingClientRect();
    if (!from || !to.width) return;   // opened from the keyboard: nothing floating, the row just unfolds
    var ghost = pic.cloneNode(true);
    ghost.classList.add('svc-ghost');
    ghost.removeAttribute('href');
    ghost.style.cssText = 'position:absolute;margin:0;left:' + (to.left - box.left) + 'px;top:' + (to.top - box.top) +
      'px;width:' + to.width + 'px;height:' + to.height + 'px';
    d.appendChild(ghost);
    d.classList.add('is-flying');
    var go = ghost.animate([
      { transform: 'translate(' + (from.x - to.left - to.width / 2) + 'px,' + (from.y - to.top - to.height / 2) + 'px) scale(' + from.w / to.width + ') rotate(' + tilt + ')' },
      { transform: 'none' }
    ], { duration: 1600, easing: 'cubic-bezier(0.45, 0, 0.15, 1)' });
    go.onfinish = go.oncancel = function () { ghost.remove(); d.classList.remove('is-flying'); };
    setTimeout(go.onfinish, 2000);   // a background tab can hold the animation: the photo must never stay hidden
  }
  // a row folds back before it closes (on its own the browser would just cut it off)
  function fold(d) {
    if (!d.open || d.classList.contains('is-closing')) return;
    if (calm) { d.open = false; return; }
    d.classList.add('is-closing');
    setTimeout(function () { d.open = false; d.classList.remove('is-closing'); }, 900);   // the fold's time in the CSS
  }
  function centre(i) {
    /* The rows are still opening and closing, so where this one will end up
       is added up from the closed heights of those above it (a summary and
       its rule), and its own height from its summary and its whole text
       (the fold is still growing). */
    var top = rows[0].getBoundingClientRect().top + studio.scrollTop, k = 0;
    for (; k < i; k++) top += rows[k].firstElementChild.offsetHeight + 1;
    var h = rows[i].firstElementChild.offsetHeight + 1 + rows[i].querySelector('.svc-body').scrollHeight,
        free = studio.clientHeight - barH,
        to = top - barH - Math.max(0, (free - h) / 2);   // a row taller than the room starts at its top
    glideTo(to);
  }
  /* Pointing at a name sends a wave down the list: that name swells most,
     the ones beside it less and a beat later, the next ones less again; the
     further ones step back. Leaving the list, the wave settles from there. */
  var names = rows.map(function (d) { return d.querySelector('.svc-name'); }),
      SWELL = [1.12, 1.06, 1.025, 1.01], last = 0;
  function wave(at) {
    if (at >= 0) last = at;
    names.forEach(function (n, k) {
      var far = Math.abs(k - last), s = at < 0 ? 1 : SWELL[far] || 1,
          up = s > (n.swell || 1);   // swelling is almost instant; settling back waits a moment
      n.swell = s;
      n.style.setProperty('--s', s);
      n.style.setProperty('--o', at < 0 ? 1 : [1, 0.75, 0.58, 0.48][far] || 0.42);
      // quick both ways, the neighbours a breath behind, so it flows under a moving pointer
      n.style.setProperty('--t', ((up ? 0.22 : 0.3) + far * 0.03).toFixed(2) + 's');
      n.style.setProperty('--d', (0.02 * Math.pow(far, 1.2)).toFixed(3) + 's');
    });
  }
  rows.forEach(function (d, i) {
    d.firstElementChild.addEventListener('mouseenter', function () { if (pointer.matches) wave(i); });
  });
  document.querySelector('.svc-list').addEventListener('mouseleave', function () { wave(-1); });

  rows.forEach(function (d, i) {
    var head = d.firstElementChild;
    head.addEventListener('click', function (e) {
      if (d.open) { e.preventDefault(); fold(d); return; }
      if (narrow.matches || calm) return;   // a phone: the CSS unfolds the row, and several can be open
      // one open at a time on a wide screen: the open one folds away while this one unfolds
      rows.forEach(function (r) { if (r !== d) fold(r); });
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
    var v = active || target();
    if (entering && v === studio) enter();
    else {
      entering = false;
      root.classList.remove('is-entering', 'is-opening');
      root.classList.add('is-revealed');
      ready();
      settle(v);
      scrolled();   // on Home, the logo parts around the phone
    }
    setTimeout(settled, calm ? 0 : 1000);
  }

  /* Home's opening, once the logo has grown in the middle of the white: a
     small card opens under it and the projects flip through it, slowing down;
     the logo parts, em to the left of the card and studio to the right; then
     the card becomes a phone, the halves make room for it, and our projects
     scroll by on its screen. While the logo crosses the card it is white on
     the photo: the logo seen in the opening is a pair of copies inside the
     first screen (a dark one under the card, a white one inside it); the real
     one takes over in the same place once the opening is done.
     shortcut: the phone is drawn; a photo of a hand holding a phone, with the
     feed laid on its screen, would be the real thing. */
  var phone = document.querySelector('.phone'),
      feed = phone.querySelector('.feed'),
      reels = [].slice.call(feed.children),
      BEAT = 2600,   // each project on the phone's screen
      sz = {};
  [['mark--ink', document.querySelector('.hero')], ['mark--light', phone]].forEach(function (c) {
    var m = mark.cloneNode(true);
    m.classList.add(c[0]);
    [].forEach.call(m.querySelectorAll('[data-part]'), function (p) { p.removeAttribute('data-part'); });
    c[1].appendChild(m);
  });
  // the card's and the phone's sizes, and where the halves of the logo go beside them
  function measure() {
    var W = innerWidth, H = innerHeight;
    sz.narrow = W < 820;
    sz.cw = Math.max(150, Math.min(260, W * (sz.narrow ? 0.42 : 0.18)));
    sz.ch = sz.cw * 4 / 3;
    sz.ph = Math.min(H * (sz.narrow ? 0.6 : 0.74), 660);
    sz.pw = sz.ph * 9 / 19.5;
    sz.W = W;
    sz.gap = Math.max(28, W * 0.035);
    sz.E = parts[0].offsetWidth;   // the halves at full size
    sz.T = parts[1].offsetWidth;
    sz.py = sz.narrow ? -H * 0.06 : 0;   // on a narrow screen the phone a little higher, the logo under it
    sz.low = sz.py + sz.ph / 2 + Math.max(18, H * 0.03) + parts[0].offsetHeight * 0.8 / 2;
    if (root.classList.contains('is-phone')) card(sz.pw, sz.ph, beside(), sz.py);   // after a resize
  }
  function card(w, h, x, y) {
    phone.style.setProperty('--w', w + 'px');
    phone.style.setProperty('--h', h + 'px');
    phone.style.setProperty('--px', (x || 0) + 'px');
    phone.style.setProperty('--py', (y || 0) + 'px');
  }
  /* The halves beside the card (half its width given; the card stays in the
     middle) or the phone. Beside the phone the three of them, em, the phone
     and studio, are centred as one group with the same margin on both sides
     (studio is twice as wide as em, so the phone moves a little to the left),
     and the logo gets smaller if they would not fit. On a narrow screen the
     whole logo goes under the phone. */
  // the transparent margins inside the two logo images (em: left, right; studio: left, right), so the gaps are the ink's
  var INK = [2 / 172, 11 / 172, 10 / 348, 3 / 348], hero = document.querySelector('.hero');
  function beside(half) {
    var r = root.style, W = sz.W, cx = W / 2, s = 1, g = sz.gap, emLeft, stLeft, centre;
    if (sz.narrow) {
      r.setProperty('--se', '0px'); r.setProperty('--ss', '0px');
      r.setProperty('--low-y', sz.low + 'px'); r.setProperty('--low-s', '0.8');
      return 0;
    }
    if (half != null) {   // beside the card, which is in the middle
      var e0 = sz.E, t0 = sz.T;
      emLeft = cx - half - g + e0 * INK[1] - e0;
      stLeft = cx + half + g - t0 * INK[2];
      centre = cx;
    } else {
      var ev = sz.E * (1 - INK[0] - INK[1]), tv = sz.T * (1 - INK[2] - INK[3]),
          margin = Math.max(48, W * 0.07);
      s = Math.min(1, (W - 2 * margin - 2 * g - sz.pw) / (ev + tv));
      ev *= s; tv *= s;
      var ink = (W - (ev + g + sz.pw + g + tv)) / 2;   // em's ink starts here, studio's ends as far from the right
      emLeft = ink - sz.E * s * INK[0];
      centre = ink + ev + g + sz.pw / 2;
      stLeft = ink + ev + g + sz.pw + g - sz.T * s * INK[2];
    }
    var e = sz.E * s, t = sz.T * s, natural = cx - (e + t) / 2;   // em's left edge with the halves together
    // the halves' moves are inside the scaled logo, so in its own (unscaled) pixels
    r.setProperty('--se', (natural - emLeft) / s + 'px');
    r.setProperty('--ss', (stLeft - (natural + e)) / s + 'px');
    r.setProperty('--low-y', '0px'); r.setProperty('--low-s', String(s));
    // the phone is placed in the first screen, which a scrollbar can make narrower than the window the logo is fixed to
    var box = hero.getBoundingClientRect();
    return centre - (box.left + box.width / 2);
  }

  // the feed: a project at a time slides up, with the bars of a story along the top
  var reel = 0, bars = phone.querySelector('.bars'), what = phone.querySelector('.what'), feeding = 0;
  reels.forEach(function () { bars.appendChild(document.createElement('span')); });
  phone.style.setProperty('--beat', BEAT / 1000 + 's');
  function label() {
    [].forEach.call(bars.children, function (b, i) { b.className = i < reel ? 'done' : i === reel ? 'now' : ''; });
    what.textContent = reels[reel].getAttribute('data-name') + ' · ' + reels[reel].getAttribute('data-kind');
  }
  function scroll() {
    reel = (reel + 1) % reels.length;
    feed.classList.toggle('is-moving', reel !== 0);   // back to the first at once, as a story starts over
    feed.style.setProperty('--k', reel);
    label();
  }
  // the phone as it is once the opening is done
  function ready() {
    measure();
    root.classList.add('is-apart', 'is-phone', 'photos-in');
    card(sz.pw, sz.ph, beside(), sz.py);
    label();
    if (!feeding) feeding = setInterval(scroll, BEAT);
  }
  addEventListener('resize', measure);

  if (entering && target() === studio) root.classList.add('is-opening', 'is-entering', 'is-held');   // no menu yet, the copies of the logo, no scrolling
  var later = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function enter() {
    measure();
    card(sz.cw, sz.ch);
    var flips = [].slice.call(phone.querySelectorAll('.flip img'));
    flips[0].classList.add('on');
    // a small card opens under the logo, and the projects flip through it, slowing down
    var opening = phone.animate([{ clipPath: 'inset(50% 50% 50% 50% round 10px)' }, { clipPath: 'inset(0% 0% 0% 0% round 10px)' }],
                                { duration: 700, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
    opening.onfinish = function () { phone.style.clipPath = 'inset(0 round 10px)'; opening.cancel(); };
    var steps = [120, 110, 110, 120, 140, 170, 210, 260], chain = later(750);
    flips.forEach(function (im, i) {
      if (!i) return;
      chain = chain.then(function () {
        flips[i - 1].classList.remove('on');
        im.classList.add('on');
        return later(steps[i - 1] || 300);
      });
    });
    chain.then(function () { return later(500); })
    // the logo parts around the card (on a narrow screen, goes down under where the phone will be)
    .then(function () {
      beside(sz.cw / 2);
      root.classList.add('is-beside');
      return later(sz.narrow ? 1200 : 1000);
    })
    // clear of the card: it becomes a phone, and the halves make room for it
    .then(function () {
      phone.style.clipPath = '';
      root.classList.add('is-apart', 'is-phone', 'photos-in');
      card(sz.pw, sz.ph, beside(), sz.py);
      return later(1100);
    })
    // done: the real logo takes over in the same place, the feed starts, the menu comes in
    .then(function () {
      entering = false;
      settle(studio);
      scrolled();
      root.classList.remove('is-entering', 'is-opening');
      ready();
      // once the real logo has faded in over the copies: they go, the page may scroll
      // (its scrollbar narrows the first screen, so the phone is placed again)
      setTimeout(function () {
        root.classList.add('is-revealed');
        root.classList.remove('is-held');
        measure();
      }, 700);
    });
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

  requestAnimationFrame(function () { root.classList.add('is-lit'); });
  // and it stops drifting while it is scrolled out of sight
  var glow = document.querySelector('.sticky');
  if (glow && window.IntersectionObserver) new IntersectionObserver(function (es) {
    glow.classList.toggle('is-away', !es[0].isIntersecting);
  }).observe(glow);

  if (calm) {
    root.classList.add('is-grown');
    settle(target());
    split = true;
    root.classList.add('is-revealed');
    ready();
    scrolled();
    settled();
  } else if (fromLavori) {
    entering = false;   // back from Lavori the logo goes straight to its place
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

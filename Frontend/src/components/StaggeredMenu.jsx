import React, { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import './StaggeredMenu.css';

export const StaggeredMenu = ({
  position = 'right',
  colors = ['#e8f6ff', '#cceeff', '#ffffff'], // Color wave layers
  items = [],                               // [{ label: 'Home', link: '/' }, { label: 'Logout', onClick: f, isAccount: true }]
  socialItems = [],                         // [{ label: 'Twitter', link: '#' }]
  displaySocials = true,
  displayItemNumbering = false,
  className = '',
  menuButtonColor = '#e9e9ef',
  openMenuButtonColor = '#e9e9ef',
  accentColor = '#e52e71',
  changeMenuColorOnOpen = false,
  isFixed = true,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const colorTweenRef = useRef(null);

  // Initialize positions and defaults (FOUC Prevention)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      if (!panel || !plusH || !plusV || !icon) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      
      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0, y: -6 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 0, y: 6 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  // Build the opening timeline
  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    // Reset components to hidden states
    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    // 1. Color Wave Slide
    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;

    // 2. Panel Slide
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    // 3. Typographic roll up
    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(itemEls, {
        yPercent: 0,
        rotate: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: { each: 0.1, from: 'start' }
      }, itemsStart);

      if (numberEls.length) {
        tl.to(numberEls, {
          duration: 0.6,
          ease: 'power2.out',
          '--sm-num-opacity': 1,
          stagger: { each: 0.08, from: 'start' }
        }, itemsStart + 0.1);
      }
    }

    // 4. Social links entrance
    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(socialLinks, {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: 'power3.out',
          stagger: { each: 0.08, from: 'start' },
          onComplete: () => {
            gsap.set(socialLinks, { clearProps: 'opacity' }); // Retain CSS hover mechanics
          }
        }, socialsStart + 0.04);
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busyRef.current = false; });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  // Unified fast slide-out on close
  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;

    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      }
    });
  }, [position]);

  // Morph hamburger lines to X
  const animateIcon = useCallback(opening => {
    const plusH = plusHRef.current;
    const plusV = plusVRef.current;
    if (!plusH || !plusV) return;
    spinTweenRef.current?.kill();
    if (opening) {
      spinTweenRef.current = gsap.to(plusH, { y: 0, rotate: 45, duration: 0.5, ease: 'power4.out', overwrite: 'auto' });
      gsap.to(plusV, { y: 0, rotate: -45, duration: 0.5, ease: 'power4.out', overwrite: 'auto' });
    } else {
      spinTweenRef.current = gsap.to(plusH, { y: -6, rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
      gsap.to(plusV, { y: 6, rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }, []);

  const animateColor = useCallback(opening => {
    const btn = toggleBtnRef.current;
    if (!btn) return;
    colorTweenRef.current?.kill();
    if (changeMenuColorOnOpen) {
      const targetColor = opening ? openMenuButtonColor : menuButtonColor;
      colorTweenRef.current = gsap.to(btn, {
        color: targetColor,
        delay: 0.18, // Matches panel slide-in
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }, [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]);

  const toggleMenu = useCallback(() => {
    if (busyRef.current) return;
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
  }, [playOpen, playClose, animateIcon, animateColor, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (openRef.current) {
      openRef.current = false;
      setOpen(false);
      onMenuClose?.();
      playClose();
      animateIcon(false);
      animateColor(false);
    }
  }, [playClose, animateIcon, animateColor, onMenuClose]);

  // Click Away listener
  useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const handleClickOutside = event => {
      if (
        panelRef.current && !panelRef.current.contains(event.target) &&
        toggleBtnRef.current && !toggleBtnRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickAway, open, closeMenu]);

  // Render via React Portal into document.body
  return (
    <div
      className={`staggered-menu-wrapper ${isFixed ? 'fixed-wrapper' : ''} ${className}`}
      style={accentColor ? { ['--sm-accent']: accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      {createPortal(
        <div className={`staggered-menu-wrapper ${isFixed ? 'fixed-wrapper' : ''}`} data-position={position}>
          <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
            {(() => {
              const raw = colors && colors.length ? colors.slice(0, 4) : ['#e8f6ff', '#ffffff'];
              let arr = [...raw];
              if (arr.length >= 3) {
                const mid = Math.floor(arr.length / 2);
                arr.splice(mid, 1);
              }
              return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
            })()}
          </div>
          <aside id="staggered-menu-panel" ref={panelRef} className="staggered-menu-panel" aria-hidden={!open}>
            <div className="sm-panel-inner">
              <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
                {items.filter(it => !it.isAccount).map((it, idx) => (
                  <li className="sm-panel-itemWrap" key={it.label + idx}>
                    <a 
                      className="sm-panel-item" 
                      href={it.link || "#"} 
                      aria-label={it.ariaLabel} 
                      data-index={idx + 1}
                      onClick={(e) => {
                        if (it.onClick) {
                          e.preventDefault();
                          it.onClick();
                          closeMenu();
                        }
                      }}
                    >
                      <span className="sm-panel-itemLabel">{it.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
              {displaySocials && socialItems && socialItems.length > 0 && (
                <div className="sm-socials" aria-label="Social links">
                  <h3 className="sm-socials-title">Socials</h3>
                  <ul className="sm-socials-list" role="list">
                    {socialItems.map((s, i) => (
                      <li key={s.label + i} className="sm-socials-item">
                        <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Account / Extra Section */}
              {items.find(it => it.isAccount) && (
                <div className="mt-auto pt-4 border-t border-white/10 sm-account-section">
                   {items.filter(it => it.isAccount).map((it, idx) => (
                     <div key={idx} className="flex items-center justify-between gap-4 py-2 px-1">
                        <div className="flex items-center gap-3">
                          <img
                            src={it.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(it.name)}`}
                            alt={it.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#e52e71]/30"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-white font-bold text-sm leading-none mb-1 truncate max-w-[150px]">{it.name}</span>
                            <span className="text-zinc-500 text-xs truncate max-w-[150px]">{it.email}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { it.onLogout(); closeMenu(); }}
                          className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors border border-red-500/20 cursor-pointer"
                          title="Log Out"
                        >
                          🚪
                        </button>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}

      <header className="staggered-menu-header">
        <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
          style={{ padding: "0.5rem" }}
        >
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={plusHRef} className="sm-icon-line" />
            <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
          </span>
        </button>
      </header>
    </div>
  );
};

export default StaggeredMenu;

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════════════════════
   Argus Service Desk — Enterprise Service Desk Platform Landing Page
   Inspired by: argus.watsapp.finspot.in + archon.finspot.in
   Two-column hero, radar scanner, ambient blobs, glassmorphic cards
   ═══════════════════════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#f8faff;--bg2:#eef2ff;
  --card:#ffffff;--card-hover:#fafaff;
  --border:rgba(99,102,241,0.12);--border-hover:rgba(99,102,241,0.3);
  --ink:#0f172a;--ink2:#334155;--text:#64748b;
  --muted:#94a3b8;
  --indigo:#6366f1;--purple:#a855f7;--violet:#8b5cf6;
  --green:#22c55e;--cyan:#06b6d4;--amber:#f59e0b;--red:#ef4444;--pink:#ec4899;
  --r:10px;--r-lg:14px;--r-xl:20px;
  --font:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;
  --mono:'JetBrains Mono',monospace;
  --mw:1200px;
}

.lp{font-family:var(--font);background:var(--bg);color:var(--text);
  -webkit-font-smoothing:antialiased;font-size:15px;line-height:1.6;overflow-x:hidden}
.lp a{text-decoration:none;color:inherit;transition:.2s}
.mx{max-width:var(--mw);margin:0 auto;padding:0 32px}

/* ── Animations ── */
@keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-20px)}}
@keyframes float-slow{0%,100%{transform:translateY(0px) scale(1)}50%{transform:translateY(-30px) scale(1.05)}}
@keyframes radar-sweep{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes radar-ping{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(1.6);opacity:0}}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes slide-up{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes scroll-x{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes glow-breathe{0%,100%{opacity:.4}50%{opacity:.7}}
@keyframes bar-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes count-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes orbit-1{0%{transform:rotate(0deg) translateX(140px) rotate(0deg)}100%{transform:rotate(360deg) translateX(140px) rotate(-360deg)}}
@keyframes orbit-2{0%{transform:rotate(120deg) translateX(100px) rotate(-120deg)}100%{transform:rotate(480deg) translateX(100px) rotate(-480deg)}}
@keyframes orbit-3{0%{transform:rotate(240deg) translateX(170px) rotate(-240deg)}100%{transform:rotate(600deg) translateX(170px) rotate(-600deg)}}

.aos{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.16,1,.3,1)}
.aos.vis{opacity:1;transform:translateY(0)}

/* ── Nav ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;
  background:rgba(248,250,255,0.6);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom:1px solid transparent;transition:.3s}
.nav.scrolled{border-bottom-color:var(--border);background:rgba(248,250,255,0.92)}
.nav-in{max-width:var(--mw);margin:0 auto;padding:0 32px;
  display:flex;align-items:center;justify-content:space-between;height:68px}
.nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer}
.nav-mark{width:34px;height:34px;border-radius:10px;
  background:linear-gradient(135deg,#6366f1,#818cf8);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 12px rgba(99,102,241,.25)}
.nav-mark svg{width:17px;height:17px;color:#fff}
.nav-brand{font-weight:800;font-size:21px;color:var(--ink);letter-spacing:-1px}
.nav-links{display:flex;gap:4px}
.nav-lk{font-size:14px;font-weight:500;color:var(--text);cursor:pointer;
  background:none;border:none;padding:8px 14px;border-radius:8px;
  transition:.2s;font-family:var(--font)}
.nav-lk:hover{color:var(--ink);background:rgba(99,102,241,.06)}
.nav-r{display:flex;align-items:center;gap:10px}
.nav-sign{font-size:14px;font-weight:500;color:var(--text);cursor:pointer;
  background:none;border:none;padding:8px 16px;border-radius:8px;
  transition:.2s;font-family:var(--font)}
.nav-sign:hover{color:var(--ink)}
.nav-ham{display:none;background:none;border:none;padding:6px;cursor:pointer;color:var(--ink)}
.nav-ham svg{width:22px;height:22px}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-family:var(--font);font-size:14px;font-weight:700;
  border:none;cursor:pointer;border-radius:var(--r);padding:12px 24px;transition:.25s;
  white-space:nowrap;position:relative;overflow:hidden}
.btn-p{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;
  box-shadow:0 4px 16px rgba(99,102,241,.3),inset 0 1px 0 rgba(255,255,255,.15)}
.btn-p:hover{transform:translateY(-2px);
  box-shadow:0 8px 28px rgba(99,102,241,.4),inset 0 1px 0 rgba(255,255,255,.2)}
.btn-p::after{content:'';position:absolute;top:0;width:60%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
  transform:skewX(-20deg);left:-100%;transition:.6s}
.btn-p:hover::after{left:200%}
.btn-g{background:#fff;color:var(--ink);border:1px solid var(--border);
  box-shadow:0 2px 8px rgba(0,0,0,.04)}
.btn-g:hover{background:#fafaff;border-color:var(--border-hover);
  transform:translateY(-2px);box-shadow:0 4px 16px rgba(99,102,241,.1)}
.btn-xl{padding:16px 32px;font-size:16px;border-radius:var(--r-lg)}

/* ── Ambient Blobs ── */
.blob{position:absolute;border-radius:50%;pointer-events:none;filter:blur(120px)}
.blob-1{width:650px;height:650px;background:rgba(99,102,241,.12);top:-5%;left:-10%;animation:float-slow 14s ease infinite}
.blob-2{width:550px;height:550px;background:rgba(168,85,247,.10);top:5%;right:-10%;animation:float-slow 16s ease infinite 2s}
.blob-3{width:450px;height:450px;background:rgba(99,102,241,.08);bottom:-5%;left:25%;animation:float-slow 18s ease infinite 4s}
.blob-4{width:400px;height:400px;background:rgba(139,92,246,.09);bottom:10%;right:10%;animation:float-slow 14s ease infinite 3s}
.blob-5{width:300px;height:300px;background:rgba(129,140,248,.07);top:40%;left:5%;animation:float-slow 16s ease infinite 5s}

/* ── Hero ── */
.hero{min-height:100vh;position:relative;display:flex;align-items:center;
  padding:120px 0 80px;overflow:hidden}
.hero-grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:60px;align-items:center}
.hero-left{position:relative;z-index:2}
.hero-badge{display:inline-flex;align-items:center;gap:8px;
  background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);
  color:var(--indigo);font-size:12px;font-weight:700;
  padding:6px 16px;border-radius:99px;margin-bottom:28px;
  font-family:var(--mono);letter-spacing:.04em;text-transform:uppercase;
  animation:slide-up .6s ease both}
.hero-badge-dot{width:8px;height:8px;border-radius:50%;background:var(--green);
  box-shadow:0 0 10px rgba(34,197,94,.6);animation:pulse-dot 2s infinite}

.hero-title{font-size:clamp(42px,4.2vw,64px);font-weight:900;line-height:1.06;
  letter-spacing:-3px;color:var(--ink);margin-bottom:24px;
  animation:slide-up .6s ease .1s both}
.hero-title .grad{background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);
  background-size:200% auto;animation:gradient-shift 6s ease infinite;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

.hero-desc{font-size:clamp(16px,1.3vw,19px);line-height:1.75;color:var(--text);
  max-width:520px;margin-bottom:36px;animation:slide-up .6s ease .2s both}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:48px;
  animation:slide-up .6s ease .3s both}

.hero-metrics{display:flex;gap:32px;animation:slide-up .6s ease .4s both}
.hero-metric{position:relative}
.hero-metric-v{font-size:28px;font-weight:900;color:var(--ink);letter-spacing:-1.5px;line-height:1}
.hero-metric-l{font-size:11px;color:var(--muted);margin-top:4px;font-family:var(--mono);
  text-transform:uppercase;letter-spacing:.06em}
.hero-metric::after{content:'';position:absolute;right:-16px;top:4px;bottom:4px;
  width:1px;background:var(--border)}
.hero-metric:last-child::after{display:none}

/* ── Radar Visualization ── */
.hero-right{position:relative;z-index:2;display:flex;align-items:center;justify-content:center}
.radar-box{width:420px;height:420px;position:relative}
.radar-ring{position:absolute;border-radius:50%;border:1px dashed rgba(99,102,241,.2)}
.radar-ring-1{border-color:rgba(99,102,241,.15)}
.radar-ring-2{border-color:rgba(129,140,248,.18)}
.radar-ring-3{border-color:rgba(167,139,250,.15)}
.radar-ring-4{border-color:rgba(99,102,241,.20)}
.radar-ring-1{inset:0}
.radar-ring-2{inset:15%}
.radar-ring-3{inset:30%}
.radar-ring-4{inset:45%}
.radar-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:18px;height:18px;border-radius:50%;
  background:linear-gradient(135deg,#6366f1,#a78bfa);
  box-shadow:0 0 20px rgba(99,102,241,.5),0 0 50px rgba(139,92,246,.2)}
.radar-sweep{position:absolute;top:50%;left:50%;width:50%;height:2px;
  transform-origin:left center;animation:radar-sweep 4s linear infinite}
.radar-sweep::before{content:'';position:absolute;right:0;top:-3px;width:6px;height:6px;
  border-radius:50%;background:var(--indigo);box-shadow:0 0 10px var(--indigo)}
.radar-sweep-trail{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0deg,rgba(99,102,241,.12) 30deg,transparent 60deg);
  animation:radar-sweep 4s linear infinite}
.radar-dot{position:absolute;width:10px;height:10px;border-radius:50%;
  transform:translate(-50%,-50%)}
.radar-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;
  animation:radar-ping 2s ease infinite}

/* Floating cards around radar */
.float-card{position:absolute;background:#fff;
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid var(--border);border-radius:var(--r-lg);
  padding:14px 18px;z-index:3;animation:float 6s ease infinite;
  box-shadow:0 4px 20px rgba(99,102,241,.08)}
.float-card-title{font-size:10px;font-family:var(--mono);text-transform:uppercase;
  letter-spacing:.06em;color:var(--muted);margin-bottom:4px}
.float-card-value{font-size:20px;font-weight:800;color:var(--ink);letter-spacing:-1px}
.float-card-trend{font-size:11px;font-family:var(--mono);margin-top:2px}

/* Orbiting dots */
.orbit-dot{position:absolute;top:50%;left:50%;width:10px;height:10px}
.orbit-dot-inner{width:10px;height:10px;border-radius:50%;
  box-shadow:0 0 8px currentColor}

/* ── Trust / Logos ── */
.trust{padding:48px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);
  background:#fff;position:relative;overflow:hidden}
.trust-label{text-align:center;font-size:12px;font-weight:600;color:var(--muted);
  text-transform:uppercase;letter-spacing:.12em;margin-bottom:24px;font-family:var(--mono)}
.trust-scroll{overflow:hidden;position:relative}
.trust-scroll::before,.trust-scroll::after{content:'';position:absolute;top:0;bottom:0;
  width:150px;z-index:2;pointer-events:none}
.trust-scroll::before{left:0;background:linear-gradient(90deg,#fff,transparent)}
.trust-scroll::after{right:0;background:linear-gradient(-90deg,#fff,transparent)}
.trust-track{display:flex;gap:12px;animation:scroll-x 35s linear infinite;width:max-content}
.trust-track:hover{animation-play-state:paused}
.trust-chip{display:flex;align-items:center;gap:10px;padding:10px 18px;
  border-radius:var(--r);border:1px solid var(--border);background:#fff;
  flex-shrink:0;transition:.2s;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.trust-chip:hover{border-color:var(--border-hover);background:#fafaff}
.trust-ini{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;
  justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0}
.trust-name{font-size:14px;font-weight:700;color:var(--ink)}
.trust-sub{font-size:10px;color:var(--muted);font-family:var(--mono)}
.trust-badges{display:flex;align-items:center;justify-content:center;gap:36px;
  margin-top:24px;flex-wrap:wrap}
.trust-b{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;
  color:var(--text);font-family:var(--mono);text-transform:uppercase;letter-spacing:.04em}
.trust-b svg{width:15px;height:15px;color:rgba(99,102,241,.6)}

/* ── Section ── */
.sec{padding:100px 0;position:relative}
.sec-hd{text-align:center;max-width:620px;margin:0 auto 64px}
.sec-over{display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;
  padding:6px 16px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.15);
  border-radius:99px;font-size:11px;font-weight:700;color:var(--indigo);
  font-family:var(--mono);letter-spacing:.08em;text-transform:uppercase}
.sec-t{font-size:clamp(30px,3.5vw,46px);font-weight:900;line-height:1.08;
  letter-spacing:-2px;color:var(--ink);margin-bottom:16px}
.sec-d{font-size:17px;line-height:1.75;color:var(--ink2)}

/* ── Feature Cards ── */
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.feat{background:var(--card);border:1px solid var(--border);border-radius:var(--r-xl);
  padding:36px 28px;transition:.35s;position:relative;overflow:hidden}
.feat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,#6366f1,#818cf8,transparent);opacity:0;transition:.3s}
.feat:hover{border-color:var(--border-hover);background:var(--card-hover);
  transform:translateY(-3px);box-shadow:0 16px 40px rgba(99,102,241,.05)}
.feat:hover::before{opacity:1}
.feat-ico{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;
  justify-content:center;margin-bottom:22px;font-size:24px}
.feat-t{font-size:18px;font-weight:800;color:var(--ink);margin-bottom:8px;letter-spacing:-.5px}
.feat-d{font-size:14px;line-height:1.75;color:var(--text)}
.feat-tag{display:inline-flex;margin-top:16px;padding:4px 12px;border-radius:6px;
  font-size:10px;font-weight:700;font-family:var(--mono);
  text-transform:uppercase;letter-spacing:.04em}

/* ── Stats Bar ── */
.stats-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:0;
  border:1px solid var(--border);border-radius:var(--r-xl);
  background:var(--card);overflow:hidden;backdrop-filter:blur(12px)}
.stat{text-align:center;padding:36px 16px;position:relative;transition:.2s}
.stat:hover{background:rgba(99,102,241,.03)}
.stat:not(:last-child)::after{content:'';position:absolute;right:0;top:18%;bottom:18%;
  width:1px;background:var(--border)}
.stat-v{font-size:clamp(28px,2.5vw,42px);font-weight:900;letter-spacing:-2px;line-height:1;
  background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text}
.stat-l{font-size:11px;color:var(--muted);margin-top:6px;font-family:var(--mono);
  text-transform:uppercase;letter-spacing:.08em}

/* ── Pipeline ── */
.pipe-wrap{position:relative;max-width:960px;margin:0 auto}
.pipe-line{position:absolute;top:36px;left:12.5%;right:12.5%;height:2px;
  background:linear-gradient(90deg,transparent,#6366f1,#818cf8,#a78bfa,transparent)}
.pipe-grid{display:grid;grid-template-columns:repeat(4,1fr);position:relative;z-index:1}
.pipe-step{text-align:center;padding:0 14px}
.pipe-n{width:56px;height:56px;border-radius:50%;background:var(--bg);
  border:2px solid var(--border);display:inline-flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-size:18px;font-weight:700;color:var(--indigo);
  margin-bottom:18px;transition:.3s}
.pipe-step:hover .pipe-n{background:linear-gradient(135deg,#6366f1,#818cf8);
  color:#fff;border-color:#6366f1;box-shadow:0 0 24px rgba(99,102,241,.3);transform:scale(1.08)}
.pipe-t{font-size:16px;font-weight:800;color:var(--ink);margin-bottom:6px;letter-spacing:-.3px}
.pipe-d{font-size:13px;line-height:1.6;color:var(--text);max-width:180px;margin:0 auto}

/* ── Integrations ── */
.int-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:940px;margin:0 auto}
.int-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);
  padding:18px 16px;display:flex;align-items:center;gap:14px;transition:.25s}
.int-card:hover{border-color:var(--border-hover);background:var(--card-hover);
  transform:translateY(-2px);box-shadow:0 10px 40px rgba(99,102,241,.05)}
.int-em{width:42px;height:42px;border-radius:var(--r);display:flex;align-items:center;
  justify-content:center;font-size:22px;flex-shrink:0;background:rgba(99,102,241,.06)}
.int-nm{font-size:14px;font-weight:700;color:var(--ink)}
.int-tp{font-size:10px;color:var(--muted);font-family:var(--mono);
  text-transform:uppercase;letter-spacing:.06em}

/* ── CTA ── */
.cta{padding:100px 0;position:relative;overflow:hidden}
.cta-bg{position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 50% at 30% 50%,rgba(99,102,241,.06),transparent),
    radial-gradient(ellipse 60% 50% at 70% 50%,rgba(139,92,246,.05),transparent)}
.cta-in{position:relative;z-index:1;max-width:600px;margin:0 auto;text-align:center}
.cta-in .sec-t{margin-bottom:16px}
.cta-in .sec-d{margin-bottom:40px}

/* ── Footer ── */
.foot{border-top:1px solid var(--border);padding:56px 0 24px;background:var(--bg2)}
.foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px}
.foot-logo{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.foot-logo-m{width:26px;height:26px;border-radius:7px;
  background:linear-gradient(135deg,#6366f1,#818cf8);
  display:flex;align-items:center;justify-content:center}
.foot-logo-m svg{width:13px;height:13px;color:#fff}
.foot-logo-t{font-weight:800;font-size:17px;color:var(--ink);letter-spacing:-.5px}
.foot-tag{font-size:14px;color:var(--text);line-height:1.7;max-width:280px}
.foot-ht{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--ink2);
  text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px}
.foot-ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.foot-ul li a{font-size:14px;color:var(--text);transition:.2s}
.foot-ul li a:hover{color:var(--indigo)}
.foot-bot{border-top:1px solid var(--border);padding-top:20px;
  display:flex;justify-content:space-between;align-items:center}
.foot-cp{font-size:12px;color:var(--muted);font-family:var(--mono)}
.foot-leg{display:flex;gap:20px}
.foot-leg a{font-size:12px;color:var(--muted);font-family:var(--mono)}
.foot-leg a:hover{color:var(--indigo)}

/* ── Responsive ── */
@media(max-width:1024px){
  .mx{padding:0 24px}
  .hero-grid{grid-template-columns:1fr;text-align:center;gap:40px}
  .hero-desc{margin-left:auto;margin-right:auto}
  .hero-btns{justify-content:center}
  .hero-metrics{justify-content:center}
  .radar-box{width:320px;height:320px}
  .float-card{padding:10px 14px;font-size:12px}
  .float-card-value{font-size:16px}
  .feat-grid{grid-template-columns:repeat(2,1fr)}
  .stats-bar{grid-template-columns:repeat(2,1fr)}
  .stat:nth-child(2)::after{display:none}
  .pipe-grid{grid-template-columns:repeat(2,1fr);gap:28px}.pipe-line{display:none}
  .int-grid{grid-template-columns:repeat(3,1fr)}
  .foot-grid{grid-template-columns:1fr 1fr;gap:28px}
}
@media(max-width:768px){
  .mx{padding:0 16px}
  .sec{padding:56px 0}
  .sec-hd{margin-bottom:40px}
  .hero{padding:90px 0 48px;min-height:auto}
  .hero-right{display:none}
  .hero-title{letter-spacing:-2px}
  .hero-desc{font-size:15px}
  .stats-bar{grid-template-columns:repeat(2,1fr)}
  .stat{padding:24px 12px}
  .stat::after{display:none!important}
  .int-grid{grid-template-columns:repeat(2,1fr)}
  .foot-grid{grid-template-columns:1fr;gap:24px}
  .foot-bot{flex-direction:column;gap:12px;text-align:center}
  .nav-links{display:none}
  .nav-ham{display:block}
  .nav-links.open{display:flex;flex-direction:column;position:absolute;top:68px;left:0;right:0;
    background:rgba(248,250,255,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);
    padding:16px 24px;gap:4px;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.08)}
  .nav-in{padding:0 16px}
  .nav-r .btn{font-size:12px;padding:10px 16px}
  .trust-badges{gap:16px}
  .trust-b{font-size:10px}
  .feat{padding:24px 20px}
  .feat-t{font-size:16px}
  .feat-d{font-size:13px}
  .pipe-step{padding:0 8px}
  .pipe-n{width:48px;height:48px;font-size:16px}
  .pipe-t{font-size:14px}
  .pipe-d{font-size:12px}
  .cta{padding:64px 0}
  .blob-1,.blob-2,.blob-3,.blob-4,.blob-5{opacity:.5}
}
@media(max-width:480px){
  .mx{padding:0 14px}
  .sec{padding:44px 0}
  .hero{padding:80px 0 36px}
  .hero-title{font-size:32px;letter-spacing:-1.5px}
  .hero-desc{font-size:14px;line-height:1.65;margin-bottom:24px}
  .hero-badge{font-size:10px;padding:5px 12px;margin-bottom:20px}
  .feat-grid{grid-template-columns:1fr}
  .pipe-grid{grid-template-columns:1fr;gap:20px}
  .int-grid{grid-template-columns:1fr}
  .stats-bar{grid-template-columns:1fr}
  .stat{padding:20px 12px}
  .hero-btns{flex-direction:column;align-items:stretch}
  .hero-btns .btn{width:100%;justify-content:center}
  .hero-metrics{flex-direction:column;gap:16px;align-items:center}
  .hero-metric::after{display:none}
  .hero-metric-v{font-size:22px}
  .nav-in{height:60px}
  .nav-brand{font-size:18px}
  .nav-mark{width:30px;height:30px}
  .nav-r .nav-sign{display:none}
  .nav-r .btn{font-size:11px;padding:8px 14px}
  .sec-t{letter-spacing:-1.5px}
  .sec-d{font-size:14px}
  .int-card{padding:14px 12px;gap:10px}
  .trust-badges{gap:12px;padding:0 8px}
  .trust-b{font-size:9px;gap:4px}
  .foot{padding:36px 0 16px}
  .foot-grid{gap:20px;margin-bottom:24px}
  .foot-tag{font-size:13px}
  .cta{padding:48px 0}
  .cta-in .sec-d{margin-bottom:28px}
  .blob-1,.blob-2,.blob-3,.blob-4,.blob-5{opacity:.3;filter:blur(80px)}
}
`;

/* ── Icons ── */
const EyeIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const Arr = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12m-4-4l4 4-4 4"/></svg>;
const Shield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const Lock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const Srv = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>;
const Menu = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const XIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const DocIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;

const FEATURES = [
  { e: '⚡', t: 'Incident Intelligence', d: 'Auto-classify, prioritize, and route incidents with AI-powered triage. Impact×Urgency matrix with automatic priority calculation.', tag: 'ITIL v4', tc: 'rgba(245,158,11,.12)', tbc: 'rgba(245,158,11,.2)', tt: '#fbbf24' },
  { e: '🧠', t: 'AI Root Cause Analysis', d: 'Deep correlation engine maps alerts to problems using 17+ knowledge patterns and real-time Prometheus enrichment.', tag: 'AI / ML', tc: 'rgba(99,102,241,.12)', tbc: 'rgba(99,102,241,.2)', tt: '#818cf8' },
  { e: '🔧', t: 'Auto-Remediation', d: '8 built-in actions — disk cleanup, pod restart, service recovery, memory release — executed via API in seconds.', tag: 'Automation', tc: 'rgba(239,68,68,.12)', tbc: 'rgba(239,68,68,.2)', tt: '#f87171' },
  { e: '☸️', t: 'K8s Orchestration', d: 'Full Kubernetes visibility via API. Monitor pods, deployments, services, and events across all your clusters.', tag: 'Cloud Native', tc: 'rgba(6,182,212,.12)', tbc: 'rgba(6,182,212,.2)', tt: '#22d3ee' },
  { e: '📊', t: 'Real-time Observability', d: 'Live Prometheus queries and Grafana dashboards. CPU, memory, disk, network — unified per-asset view.', tag: 'Monitoring', tc: 'rgba(34,197,94,.12)', tbc: 'rgba(34,197,94,.2)', tt: '#4ade80' },
  { e: '🛡️', t: 'ITIL Compliance', d: 'Full ITIL v4 lifecycle — incidents, problems, changes, CMDB, SLA, knowledge base, and escalation in one platform.', tag: 'Governance', tc: 'rgba(168,85,247,.12)', tbc: 'rgba(168,85,247,.2)', tt: '#c084fc' },
];

const STEPS = [
  { n: '01', t: 'Alert Detected', d: 'Prometheus, Grafana, or webhooks fire. Alerts ingested and deduplicated.' },
  { n: '02', t: 'AI Triage', d: 'Auto-classify severity, route to the right team, enrich with live metrics.' },
  { n: '03', t: 'Auto-Remediate', d: 'Proven actions execute via API with full audit trail and rollback.' },
  { n: '04', t: 'Verify & Close', d: 'Health checks confirm resolution. Auto-resolve within SLA window.' },
];

const INTEGRATIONS = [
  { n: 'Prometheus', t: 'Monitoring', e: '🔥' }, { n: 'Grafana', t: 'Dashboards', e: '📊' },
  { n: 'Kubernetes', t: 'Orchestration', e: '☸️' }, { n: 'PagerDuty', t: 'On-Call', e: '📟' },
  { n: 'Slack', t: 'Messaging', e: '💬' }, { n: 'ServiceNow', t: 'Service Desk', e: '🎫' },
  { n: 'Loki', t: 'Logging', e: '📋' }, { n: 'PostgreSQL', t: 'Database', e: '🐘' },
  { n: 'Redis', t: 'Cache', e: '🔴' }, { n: 'Ollama AI', t: 'LLM Engine', e: '🧠' },
  { n: 'StackStorm', t: 'Automation', e: '⚡' }, { n: 'Apprise', t: 'Notifications', e: '🔔' },
];

const CLIENTS = [
  { n: 'TechCorp', i: 'TC', c: '#6366f1', s: 'Technology' },
  { n: 'FinServe', i: 'FS', c: '#a855f7', s: 'Finance' },
  { n: 'CloudNet', i: 'CN', c: '#818cf8', s: 'Cloud Infra' },
  { n: 'DataFlow', i: 'DF', c: '#059669', s: 'Data Platform' },
  { n: 'SecureOps', i: 'SO', c: '#ef4444', s: 'Security' },
  { n: 'ScaleUp', i: 'SU', c: '#f59e0b', s: 'DevOps' },
  { n: 'NetPulse', i: 'NP', c: '#06b6d4', s: 'Networking' },
  { n: 'InfraMax', i: 'IM', c: '#8b5cf6', s: 'Infrastructure' },
  { n: 'DevForge', i: 'DV', c: '#ec4899', s: 'Development' },
  { n: 'SysWatch', i: 'SW', c: '#6366f1', s: 'Monitoring' },
];

/* Counter */
function Counter({ end, suffix = '', prefix = '', visible }: { end: number; suffix?: string; prefix?: string; visible: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const dur = 2200, start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setV((1 - Math.pow(1 - p, 3)) * end);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, visible]);
  return <>{prefix}{end % 1 !== 0 ? v.toFixed(1) : Math.round(v).toLocaleString()}{suffix}</>;
}

/* Scroll reveal */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('vis'); obs.unobserve(el); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal();
  return <div ref={ref} className={`aos ${className}`}>{children}</div>;
}

/* ── Page ── */
export default function LandingPage() {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsVis, setStatsVis] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStatsVis(true); obs.unobserve(el); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const go = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="lp">

        {/* Nav */}
        <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
          <div className="nav-in">
            <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="nav-mark"><EyeIcon /></div>
              <span className="nav-brand">Argus</span>
            </div>
            <div className={`nav-links${menuOpen ? ' open' : ''}`}>
              <button className="nav-lk" onClick={() => go('features')}>Features</button>
              <button className="nav-lk" onClick={() => go('how')}>How It Works</button>
              <button className="nav-lk" onClick={() => go('integrations')}>Integrations</button>
              <button className="nav-lk" onClick={() => nav('/docs')}>Docs</button>
              {/* Mobile-only: show sign-in and signup inside the menu */}
              {menuOpen && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                  <button className="nav-lk" onClick={() => { setMenuOpen(false); nav('/login'); }}>Sign In</button>
                  <button className="nav-lk" style={{ color: '#818cf8', fontWeight: 700 }} onClick={() => { setMenuOpen(false); nav('/signup'); }}>Get Started Free</button>
                </>
              )}
            </div>
            <div className="nav-r">
              <button className="nav-sign" onClick={() => nav('/login')}>Sign In</button>
              <button className="btn btn-p" onClick={() => nav('/signup')}>Get Started Free</button>
              <button className="nav-ham" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <XIcon /> : <Menu />}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
          <div className="blob blob-5" />

          <div className="mx" style={{ width: '100%' }}>
            <div className="hero-grid">
              {/* Left column */}
              <div className="hero-left">
                <div className="hero-badge">
                  <span className="hero-badge-dot" />
                  AI-Powered Service Desk Platform
                </div>
                <h1 className="hero-title">
                  Resolve Incidents<br />
                  <span className="grad">10x Faster</span> with AI
                </h1>
                <p className="hero-desc">
                  Unified observability, AI-powered triage, auto-remediation, and full ITIL lifecycle management. From alert to resolution in minutes, not hours.
                </p>
                <div className="hero-btns">
                  <button className="btn btn-p btn-xl" onClick={() => nav('/signup')}>
                    Start Free Trial <Arr />
                  </button>
                  <button className="btn btn-g btn-xl" onClick={() => nav('/docs')}>
                    <DocIcon /> View API Docs
                  </button>
                </div>
                <div className="hero-metrics">
                  <div className="hero-metric">
                    <div className="hero-metric-v">99.9%</div>
                    <div className="hero-metric-l">Uptime SLA</div>
                  </div>
                  <div className="hero-metric">
                    <div className="hero-metric-v">&lt;2min</div>
                    <div className="hero-metric-l">Mean MTTR</div>
                  </div>
                  <div className="hero-metric">
                    <div className="hero-metric-v">10K+</div>
                    <div className="hero-metric-l">Alerts Processed</div>
                  </div>
                </div>
              </div>

              {/* Right column — Radar */}
              <div className="hero-right">
                <div className="radar-box">
                  <div className="radar-ring radar-ring-1" />
                  <div className="radar-ring radar-ring-2" />
                  <div className="radar-ring radar-ring-3" />
                  <div className="radar-ring radar-ring-4" />
                  <div className="radar-center" />
                  <div className="radar-sweep-trail" />
                  <div className="radar-sweep" />

                  {/* Orbiting dots */}
                  <div className="orbit-dot" style={{ animation: 'orbit-1 8s linear infinite' }}>
                    <div className="orbit-dot-inner" style={{ background: '#6366f1', color: '#6366f1' }} />
                  </div>
                  <div className="orbit-dot" style={{ animation: 'orbit-2 12s linear infinite' }}>
                    <div className="orbit-dot-inner" style={{ background: '#22c55e', color: '#22c55e' }} />
                  </div>
                  <div className="orbit-dot" style={{ animation: 'orbit-3 10s linear infinite' }}>
                    <div className="orbit-dot-inner" style={{ background: '#f59e0b', color: '#f59e0b' }} />
                  </div>

                  {/* Radar dots */}
                  <div className="radar-dot" style={{ top: '25%', left: '35%', background: '#22c55e', boxShadow: '0 0 12px rgba(34,197,94,.6)' }}>
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(34,197,94,.3)', animation: 'radar-ping 2s ease infinite' }} />
                  </div>
                  <div className="radar-dot" style={{ top: '60%', left: '70%', background: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,.6)' }}>
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(239,68,68,.3)', animation: 'radar-ping 2s ease infinite .5s' }} />
                  </div>
                  <div className="radar-dot" style={{ top: '40%', left: '65%', background: '#f59e0b', boxShadow: '0 0 12px rgba(245,158,11,.6)' }}>
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(245,158,11,.3)', animation: 'radar-ping 2s ease infinite 1s' }} />
                  </div>
                  <div className="radar-dot" style={{ top: '70%', left: '30%', background: '#6366f1', boxShadow: '0 0 12px rgba(99,102,241,.6)' }}>
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(99,102,241,.3)', animation: 'radar-ping 2s ease infinite 1.5s' }} />
                  </div>

                  {/* Floating stat cards */}
                  <div className="float-card" style={{ top: -10, right: -20, animationDelay: '0s' }}>
                    <div className="float-card-title">Auto-Resolved</div>
                    <div className="float-card-value">67%</div>
                    <div className="float-card-trend" style={{ color: '#4ade80' }}>↑ 12% this week</div>
                  </div>
                  <div className="float-card" style={{ bottom: 20, left: -30, animationDelay: '3s' }}>
                    <div className="float-card-title">MTTR</div>
                    <div className="float-card-value">1.8m</div>
                    <div className="float-card-trend" style={{ color: '#4ade80' }}>Below SLA target</div>
                  </div>
                  <div className="float-card" style={{ top: '40%', right: -40, animationDelay: '1.5s' }}>
                    <div className="float-card-title">Active Incidents</div>
                    <div className="float-card-value">23</div>
                    <div className="float-card-trend" style={{ color: '#fbbf24' }}>3 P1 critical</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="trust">
          <div className="mx"><div className="trust-label">Trusted by engineering teams worldwide</div></div>
          <div className="trust-scroll">
            <div className="trust-track">
              {[...CLIENTS, ...CLIENTS].map((c, i) => (
                <div key={i} className="trust-chip">
                  <div className="trust-ini" style={{ background: c.c }}>{c.i}</div>
                  <div><div className="trust-name">{c.n}</div><div className="trust-sub">{c.s}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="mx">
            <div className="trust-badges">
              <div className="trust-b"><Shield /> SOC 2 Type II</div>
              <div className="trust-b"><Lock /> ISO 27001</div>
              <div className="trust-b"><Srv /> 99.99% Uptime</div>
              <div className="trust-b"><Shield /> RBAC + Multi-Tenant</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="sec" id="features">
          <div className="blob blob-1" style={{ top: '20%', opacity: 0.5 }} />
          <div className="blob blob-2" style={{ top: '50%', right: '-15%', opacity: 0.4 }} />
          <div className="mx">
            <Reveal><div className="sec-hd">
              <span className="sec-over">Platform Capabilities</span>
              <h2 className="sec-t">Everything you need to manage IT at scale</h2>
              <p className="sec-d">From alert detection to automated resolution — Argus handles the full ITIL lifecycle with AI-powered intelligence.</p>
            </div></Reveal>
            <div className="feat-grid">
              {FEATURES.map((f, i) => (
                <Reveal key={i}>
                  <div className="feat">
                    <div className="feat-ico" style={{ background: f.tc, fontSize: 26 }}>{f.e}</div>
                    <div className="feat-t">{f.t}</div>
                    <p className="feat-d">{f.d}</p>
                    <span className="feat-tag" style={{ background: f.tc, color: f.tt, border: `1px solid ${f.tbc}` }}>{f.tag}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="sec" id="how" style={{ background: 'rgba(255,255,255,.01)' }}>
          <div className="mx">
            <Reveal><div className="sec-hd">
              <span className="sec-over">AI Pipeline</span>
              <h2 className="sec-t">From alert to resolution in minutes</h2>
              <p className="sec-d">Our AI-powered pipeline detects, triages, remediates, and verifies — fully automated with zero human intervention.</p>
            </div></Reveal>
            <Reveal><div className="pipe-wrap">
              <div className="pipe-line" />
              <div className="pipe-grid">
                {STEPS.map((s, i) => (
                  <div key={i} className="pipe-step">
                    <div className="pipe-n">{s.n}</div>
                    <div className="pipe-t">{s.t}</div>
                    <p className="pipe-d">{s.d}</p>
                  </div>
                ))}
              </div>
            </div></Reveal>
          </div>
        </section>

        {/* Stats */}
        <section className="sec" ref={statsRef} style={{ background: 'linear-gradient(180deg,var(--bg),rgba(99,102,241,.02),var(--bg))' }}>
          <div className="mx">
            <Reveal><div className="sec-hd">
              <span className="sec-over">By the Numbers</span>
              <h2 className="sec-t">Proven at scale across production</h2>
            </div></Reveal>
            <Reveal><div className="stats-bar">
              {[
                { v: 99.9, s: '%', l: 'Platform Uptime' },
                { v: 10000, s: '+', l: 'Alerts Processed' },
                { v: 5000, s: '+', l: 'Incidents Resolved' },
                { v: 67, s: '%', l: 'Auto-Resolved' },
              ].map((s, i) => (
                <div key={i} className="stat">
                  <div className="stat-v"><Counter end={s.v} suffix={s.s} visible={statsVis} /></div>
                  <div className="stat-l">{s.l}</div>
                </div>
              ))}
            </div></Reveal>
          </div>
        </section>

        {/* Integrations */}
        <section className="sec" id="integrations" style={{ background: 'rgba(255,255,255,.01)' }}>
          <div className="mx">
            <Reveal><div className="sec-hd">
              <span className="sec-over">Ecosystem</span>
              <h2 className="sec-t">Works with your entire stack</h2>
              <p className="sec-d">Native integrations with monitoring, alerting, orchestration, and communication platforms.</p>
            </div></Reveal>
            <Reveal><div className="int-grid">
              {INTEGRATIONS.map((ig, i) => (
                <div key={i} className="int-card">
                  <div className="int-em">{ig.e}</div>
                  <div><div className="int-nm">{ig.n}</div><div className="int-tp">{ig.t}</div></div>
                </div>
              ))}
            </div></Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="cta">
          <div className="cta-bg" />
          <div className="cta-in">
            <Reveal>
              <h2 className="sec-t">Ready to transform your IT operations?</h2>
              <p className="sec-d">Start your free trial today. No credit card required. Full platform access for 14 days.</p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-p btn-xl" onClick={() => nav('/signup')}>Start Free Trial <Arr /></button>
                <button className="btn btn-g btn-xl" onClick={() => nav('/docs')}><DocIcon /> API Documentation</button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="foot">
          <div className="mx">
            <div className="foot-grid">
              <div>
                <div className="foot-logo">
                  <div className="foot-logo-m"><EyeIcon /></div>
                  <span className="foot-logo-t">Argus</span>
                </div>
                <p className="foot-tag">Enterprise IT Service Management platform. AI-powered incident management, monitoring, and auto-remediation.</p>
              </div>
              <div>
                <div className="foot-ht">Product</div>
                <ul className="foot-ul">
                  <li><a href="#features" onClick={e => { e.preventDefault(); go('features'); }}>Features</a></li>
                  <li><a href="#integrations" onClick={e => { e.preventDefault(); go('integrations'); }}>Integrations</a></li>
                  <li><a href="#how" onClick={e => { e.preventDefault(); go('how'); }}>How It Works</a></li>
                </ul>
              </div>
              <div>
                <div className="foot-ht">Platform</div>
                <ul className="foot-ul">
                  <li><a href="/signup">Sign Up</a></li>
                  <li><a href="/login">Sign In</a></li>
                  <li><a href="/docs">API Docs</a></li>
                </ul>
              </div>
              <div>
                <div className="foot-ht">Company</div>
                <ul className="foot-ul">
                  <li><a href="#">About</a></li>
                  <li><a href="mailto:support@argus.com">Contact</a></li>
                  <li><a href="#">Status Page</a></li>
                </ul>
              </div>
            </div>
            <div className="foot-bot">
              <div className="foot-cp">&copy; {new Date().getFullYear()} FinSpot Technology Solutions Private Limited. All rights reserved.</div>
              <div className="foot-leg">
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
